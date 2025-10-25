#!/usr/bin/env python3

"""
Get the bssh fastq outputs from a given directory.

Given the instrumentRunId, look through the bssh to aws s3 to get the interop and reports output

"""

# Standard imports
from typing import List

# Layer Imports
from orcabus_api_tools.workflow import (
    list_workflow_runs_by_workflow_name,
    get_latest_payload_from_workflow_run,
    get_workflow_request_response_results
)
from orcabus_api_tools.workflow.globals import WORKFLOW_RUN_ENDPOINT
from orcabus_api_tools.workflow.models import WorkflowRunDetail

# Globals
BSSH_TO_AWS_S3_WORKFLOW_NAME = "bssh-to-aws-s3"


def list_workflow_runs_by_workflow_name_legacy(
        workflow_name: str,
) -> List[WorkflowRunDetail]:
    """
    Use the query name to get workflows from a workflow name
    :param workflow_name:
    :return:
    """

    return get_workflow_request_response_results(
        WORKFLOW_RUN_ENDPOINT,
        params={
            "workflow__workflowName": workflow_name
        }
    )


def handler(event, context):
    """
    Get the bssh fastq outputs from a given directory
    :param event:
    :param context:
    :return:
    """

    # Get inputs
    instrument_run_id = event.get("instrumentRunId")

    bssh_workflows_list = list_workflow_runs_by_workflow_name(
        workflow_name=BSSH_TO_AWS_S3_WORKFLOW_NAME
    )

    if len(bssh_workflows_list) == 0:
        bssh_workflows_list = list_workflow_runs_by_workflow_name_legacy(
            workflow_name=BSSH_TO_AWS_S3_WORKFLOW_NAME
        )

    if len(bssh_workflows_list) == 0:
        return {}

    # Get the bssh workflow object
    try:
        bssh_workflow = next(filter(
            lambda workflow_run_iter_: (
                get_latest_payload_from_workflow_run(workflow_run_iter_['orcabusId']).get('data', {}).get('inputs', {}).get('instrumentRunId', "") == instrument_run_id and
                workflow_run_iter_['currentState']['status'] == 'SUCCEEDED'
            ),
            sorted(
                bssh_workflows_list,
                key=lambda workflow_run_iter_: workflow_run_iter_['orcabusId'],
                reverse=True
            )
        ))
    except StopIteration:
        return {}

    # Get the payload
    bssh_payload = get_latest_payload_from_workflow_run(bssh_workflow['orcabusId'])

    # Get the output directories for BCL Convert report and InterOp data
    return {
        "bclConvertReportDirectory": bssh_payload['data']['engineParameters']['outputUri'] + "Reports/",
        "interOpDirectory": bssh_payload['data']['engineParameters']['outputUri'] + "InterOp/"
    }
