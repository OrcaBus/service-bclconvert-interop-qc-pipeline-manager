#!/usr/bin/env python3

"""
Post-schema validation for bclconvert-interop-qc pipeline.

Validates:
1. Engine parameters (projectId, outputUri, logsUri, cacheUri, pipelineId)
2. Input URIs are accessible via Filemanager and linked to ICA project
"""

# Imports
from typing import Dict, Tuple, List, cast
import logging
from os import environ
from time import sleep
from urllib.parse import urlparse
from pathlib import Path

# Wrapica imports
from libica.openapi.v3 import ApiException
from wrapica.project_data import coerce_data_id_or_uri_to_project_data_obj, get_project_data_obj_by_id
from wrapica.storage_configuration import get_s3_key_prefix_by_project_id
from wrapica.project_pipelines import get_project_pipeline_obj
from wrapica.project import get_project_obj_from_project_id

# Layer imports
from orcabus_api_tools.workflow import add_comment_to_workflow_run, get_workflow_run
from orcabus_api_tools.filemanager import get_s3_object_id_from_s3_uri, list_files_recursively
from orcabus_api_tools.filemanager.errors import S3FileNotFoundError
from icav2_tools import set_icav2_env_vars

# Globals
WORKFLOW_NAME_ENV_VAR = "WORKFLOW_NAME"
TEST_BUCKET_ENV_VAR = "TEST_DATA_BUCKET_NAME"
REF_DATA_BUCKET_ENV_VAR = "REF_DATA_BUCKET_NAME"

# Get env var values
TEST_BUCKET = environ[TEST_BUCKET_ENV_VAR]
REF_DATA_BUCKET = environ[REF_DATA_BUCKET_ENV_VAR]
WORKFLOW_NAME = environ[WORKFLOW_NAME_ENV_VAR]
COMMENT_AUTHOR = f"{WORKFLOW_NAME}-post-schema-validation-service"

# Midfixes
ANALYSIS_MIDFIX = "analysis"
LOGS_MIDFIX = "logs"

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Comment formatting constants
MAX_COMMENT_LENGTH = 1024
TRUNCATION_SUFFIX = "\n... [truncated, see execution ARN for full detail]"


def _format_comment_with_arn(body: str, execution_arn: str) -> str:
    """
    Append the execution ARN footer to a comment and enforce the 1024 char limit.
    """
    footer = f"---\nStep Functions Execution: {execution_arn}"
    full_comment = f"{body}\n{footer}"

    if len(full_comment) > MAX_COMMENT_LENGTH:
        available = MAX_COMMENT_LENGTH - len(footer) - len(TRUNCATION_SUFFIX) - 1
        full_comment = f"{body[:available]}{TRUNCATION_SUFFIX}\n{footer}"

    return full_comment


def validate_engine_parameters(
        engine_parameters: Dict,
        workflow_run_id: str,
        project_prefix: str,
) -> Tuple[bool, str]:
    """
    Validate the engine parameters.

    Checks:
    - projectId resolves to a valid ICAv2 project
    - outputUri starts with the project's S3 key prefix
    - logsUri starts with the project's S3 key prefix
    - cacheUri starts with the project's S3 key prefix
    - outputUri ends with /<analysis-midfix>/<workflow-name>/<portal-run-id>/
    - logsUri ends with /logs/<workflow-name>/<portal-run-id>/
    - pipelineId is accessible in the project

    :param engine_parameters: The engine parameters to validate.
    :param workflow_run_id: The workflow run ID (orcabusId)
    :param project_prefix: The project S3 prefix
    :return: A tuple of (is_valid, comment)
    """
    project_id = cast(str, engine_parameters.get("projectId"))
    output_uri = engine_parameters.get("outputUri", "")
    logs_uri = engine_parameters.get("logsUri", "")
    cache_uri = engine_parameters.get("cacheUri", "")
    pipeline_id = engine_parameters.get("pipelineId", "")

    # Validate projectId
    if project_id is None:
        return False, "projectId is not set"
    try:
        get_project_obj_from_project_id(project_id)
    except ApiException:
        return False, f"Cannot find project id {project_id}"

    # Validate outputUri is within project context
    if not output_uri.startswith(project_prefix):
        return False, f"outputUri '{output_uri}' is not in the project context '{project_prefix}'"

    # Validate logsUri is within project context
    if not logs_uri.startswith(project_prefix):
        return False, f"logsUri '{logs_uri}' is not in the project context '{project_prefix}'"

    # Validate cacheUri is within project context
    if cache_uri and not cache_uri.startswith(project_prefix):
        return False, f"cacheUri '{cache_uri}' is not in the project context '{project_prefix}'"

    # Validate pipelineId is accessible in the project
    try:
        _ = get_project_pipeline_obj(
            project_id=project_id,
            pipeline_id=pipeline_id,
        )
    except ValueError:
        return False, f"The pipeline {pipeline_id} cannot be found in the project {project_id}"

    # Get the portal run id from the workflow run id
    portal_run_id = get_workflow_run(workflow_run_id)['portalRunId']

    # Validate outputUri ends with /<analysis-midfix>/<workflow-name>/<portal-run-id>/
    if not output_uri.endswith(f"/{ANALYSIS_MIDFIX}/{WORKFLOW_NAME}/{portal_run_id}/"):
        return False, (
            f"outputUri '{output_uri}' does not end with "
            f"'/{ANALYSIS_MIDFIX}/{WORKFLOW_NAME}/{portal_run_id}/'"
        )

    # Validate logsUri ends with /logs/<workflow-name>/<portal-run-id>/
    if not logs_uri.endswith(f"/{LOGS_MIDFIX}/{WORKFLOW_NAME}/{portal_run_id}/"):
        return False, (
            f"logsUri '{logs_uri}' does not end with "
            f"'/{LOGS_MIDFIX}/{WORKFLOW_NAME}/{portal_run_id}/'"
        )

    return True, ""


def validate_inputs(
        inputs: Dict,
        project_id: str,
        project_prefix: str,
) -> Tuple[bool, str]:
    """
    Validate the inputs.

    Performs two-phase validation:
    1. Filemanager existence check — confirms file/folder URIs exist at the S3 level
       (excludes reference data bucket URIs since they are not indexed by the Filemanager)
    2. ICA project context check — confirms URIs outside of ref/test/project-prefix
       are linked to the project

    For bclconvert-interop-qc, the input URIs come from:
    - additionalMultiQcDataFiles[].multiqcParquetFileUri (S3 URIs)
    - interOpDirectory (ICA folder ID - not an S3 URI, skip)
    - bclConvertReportDirectory (ICA folder ID - not an S3 URI, skip)

    :param inputs: The inputs to validate.
    :param project_id: The ICAv2 project id to validate against.
    :param project_prefix: The ICAv2 project prefix
    :return: A tuple of (is_valid, comment)
    """
    # Collect all S3 data URIs from inputs
    data_uris: List[str] = []

    # additionalMultiQcDataFiles contains multiqcParquetFileUri
    for multiqc_obj in inputs.get("additionalMultiQcDataFiles", []):
        uri = multiqc_obj.get("multiqcParquetFileUri")
        if uri:
            data_uris.append(uri)

    # If there are no data URIs to validate, return valid
    if not data_uris:
        return True, ""

    # Phase 1: Filemanager existence check — ALL URIs except refdata bucket
    non_reference_data_uris = list(filter(
        lambda uri: not uri.startswith(f"s3://{REF_DATA_BUCKET}/"),
        data_uris
    ))
    for data_uri in non_reference_data_uris:
        if data_uri.endswith("/"):
            # Folder URI — verify at least 1 file exists under that prefix
            bucket = urlparse(data_uri).netloc
            key = str(Path(urlparse(data_uri).path)) + "/"
            if not (
                len(list_files_recursively(bucket, key)) > 0
            ):
                return False, (
                    f"Folder URI '{data_uri}' has no files found under "
                    f"that prefix in the Filemanager"
                )
        else:
            # File URI — confirm the file exists
            try:
                get_s3_object_id_from_s3_uri(data_uri)
            except S3FileNotFoundError:
                return False, (
                    f"Data URI '{data_uri}' cannot be found by the Filemanager, "
                    f"are you sure it exists?"
                )

    # Phase 2: ICA project context validation
    # Only URIs outside ref/test/project-prefix need ICA project linking confirmed
    uris_to_validate = [
        uri for uri in data_uris
        if not (
            uri.startswith(f"s3://{REF_DATA_BUCKET}/") or
            uri.startswith(f"s3://{TEST_BUCKET}/") or
            uri.startswith(project_prefix)
        )
    ]

    # Validate each URI is accessible in the project context
    for data_uri in uris_to_validate:
        try:
            project_data_obj = coerce_data_id_or_uri_to_project_data_obj(
                data_id_or_uri=data_uri,
            )
        except ValueError:
            return False, (
                f"Data URI '{data_uri}' cannot be found in the "
                f"project context '{project_id}'"
            )

        try:
            get_project_data_obj_by_id(
                project_id=project_id,
                data_id=project_data_obj.data.id
            )
        except ApiException:
            return False, (
                f"Data URI '{data_uri}' cannot be found in the "
                f"project context '{project_id}'"
            )

    return True, ""


def handler(event, context) -> Dict[str, bool]:
    """
    Post-schema validation handler for bclconvert-interop-qc.

    Input:
      {
        "workflowRunId": "wfr.xxx",
        "data": {
          "engineParameters": {
            "projectId": "...",
            "pipelineId": "...",
            "outputUri": "s3://...",
            "logsUri": "s3://...",
            "cacheUri": "s3://..."
          },
          "inputs": { ... },
          "tags": { ... }
        },
        "executionArn": "arn:aws:states:..."
      }

    Output:
      {"isValid": true}   — all checks pass
      {"isValid": false}  — at least one check failed (comment written)
    """
    # Set ICAv2 env vars
    set_icav2_env_vars()

    # Get the event data
    payload_data = event.get('data')
    workflow_run_id = event.get("workflowRunId", "")
    execution_arn = event.get("executionArn", "")

    # Get the engine parameters
    engine_parameters = payload_data.get("engineParameters", {})

    # Get the project prefix
    project_prefix = cast(
        str,
        get_s3_key_prefix_by_project_id(engine_parameters.get("projectId"))
    )

    # Validate engine parameters
    is_valid, comment = validate_engine_parameters(
        engine_parameters,
        workflow_run_id=workflow_run_id,
        project_prefix=project_prefix,
    )

    # Validate inputs if engine parameters are valid
    if is_valid:
        inputs = payload_data.get("inputs", {})
        is_valid, comment = validate_inputs(
            inputs,
            project_id=engine_parameters.get("projectId"),
            project_prefix=project_prefix,
        )

    # Handle validation failure
    if not is_valid:
        if isinstance(comment, list) and len(comment) == 1:
            comment = comment[0]
        if isinstance(comment, list):
            add_comment_to_workflow_run(
                workflow_run_orcabus_id=workflow_run_id,
                comment=_format_comment_with_arn(
                    f"Post schema validation failed for {len(comment)} reasons",
                    execution_arn
                ),
                author=COMMENT_AUTHOR
            )
            for idx, comment_iter in enumerate(comment, start=1):
                add_comment_to_workflow_run(
                    workflow_run_orcabus_id=workflow_run_id,
                    comment=_format_comment_with_arn(
                        f"Reason {idx} of {len(comment)}: {comment_iter}",
                        execution_arn
                    ),
                    author=COMMENT_AUTHOR
                )
                sleep(1)
        else:
            add_comment_to_workflow_run(
                workflow_run_orcabus_id=workflow_run_id,
                comment=_format_comment_with_arn(
                    f"Post schema validation failed: {comment}",
                    execution_arn
                ),
                author=COMMENT_AUTHOR
            )
        return {
            "isValid": False
        }

    return {
        "isValid": True
    }


# if __name__ == "__main__":
#     import json
#     print(
#         json.dumps(
#             handler(
#                 {
#                     "workflowRunId": "wfr.xxx",
#                     "executionArn": "arn:aws:states:ap-southeast-2:123456789012:execution:test:test",
#                     "data": {
#                         "engineParameters": {
#                             "projectId": "xxx",
#                             "pipelineId": "xxx",
#                             "outputUri": "s3://bucket/prefix/analysis/bclconvert-interop-qc/portal-run-id/",
#                             "logsUri": "s3://bucket/prefix/logs/bclconvert-interop-qc/portal-run-id/",
#                             "cacheUri": "s3://bucket/prefix/cache/bclconvert-interop-qc/"
#                         },
#                         "inputs": {
#                             "instrumentRunId": "251003_A00130_0384_AHL7LWDSXF",
#                             "interOpDirectory": "fol.xxx",
#                             "bclConvertReportDirectory": "fol.xxx"
#                         },
#                         "tags": {
#                             "instrumentRunId": "251003_A00130_0384_AHL7LWDSXF",
#                             "libraryIdList": ["LIB12345"]
#                         }
#                     }
#                 },
#                 None
#             ),
#             indent=2
#         )
#     )
