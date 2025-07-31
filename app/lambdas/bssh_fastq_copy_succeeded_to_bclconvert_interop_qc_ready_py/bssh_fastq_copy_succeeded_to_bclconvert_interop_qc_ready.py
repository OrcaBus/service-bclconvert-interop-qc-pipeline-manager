#!/usr/bin/env python3

"""
BSSH Fastq Copy Succeeded to BCLConvert Interop QC Ready

{
    "workflowName": "bclconvert-interop-qc",
    "workflowVersion": "2025.05.24",
    "workflowRunName": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
    "portalRunId": "20250417abcd1234",  // pragma: allowlist secret
    "instrumentRunId": "{% $instrumentRunId %}",
    "primaryDataOutputUri": "{% $primaryDataOutputUri %}",
    "linkedLibraries": "{% $linkedLibraries %}",
    "workflowOutputUriPrefix": "s3://path/to/output/uri...",
    "workflowLogsUriPrefix": "s3://path/to/logs/uri...",
}

TO

{
  // Workflow run status
  "status": "READY",
  // Timestamp of the event
  "timestamp": "2025-04-22T00:09:07.220Z",
  // Portal Run ID For the BSSH Fastq Copy Manager
  "portalRunId": "20250417abcd1234",  // pragma: allowlist secret
  // Workflow name
  "workflowName": "bclconvert-interop-qc",
  // Workflow version
  "workflowVersion": "2025.05.24",
  // Workflow run name
  "workflowRunName": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
  // Linked libraries in the instrument run
  "linkedLibraries": [
    {
      "orcabusId": "lib.12345",
      "libraryId": "L20202020"
    }
  ],
  "payload": {
    "refId": "workflowmanagerrefid",
    "version": "2024.07.01",
    "data": {
      // Original inputs from READY State
      "inputs": {
        // The instrument run ID is used to identify the BCLConvert InterOp QC Manager workflow
        // We get this from the BSSH Fastq To AWS S3 Copy Succeeded Event payload.data.inputs.instrumentRunId
        "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3",
        // InterOp Directory
        // Collected from the payload.data.outputs.outputUri + 'InterOp/'
        "interOpDirectory": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/InterOp/",
        // BCLConvert Report Directory
        // Collected from the payload.data.outputs.outputUri + 'Reports/'
        "bclConvertReportDirectory": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/Reports/"
      },
      // The engine parameters are used to launch the BCLConvert InterOp QC Manager workflow on ICAv2
      "engineParameters": {
        // The output URI is used to identify the BCLConvert InterOp QC Manager workflow
        "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/analysis/bclconvert-interop-qc/20250417abcd1234/",
        // This is where the ICA Logs will be stored
        "logsUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/logs/bclconvert-interop-qc/20250417abcd1234/",
      },
      // Tags (same as bssh fastq to aws s3 copy succeeded event)
      "tags": {
       "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
      }
    }
  }
}
"""

# Imports
from typing import Dict, Any
from datetime import datetime, timezone

# Globals
READY_STATUS = "READY"  # Always set to READY for the BCLConvert Interop QC Manager workflow


def handler(event, context) -> Dict[str, Dict[str, Any]]:
    """
    We perform the following steps:

    1. Get the inputs from the payloads

    2. Construct the output payload for the BCLConvert Interop QC Manager workflow
    :param event:
    :param context:
    :return:
    """

    # Get inputs
    workflow_name = event["workflowName"]
    workflow_version = event["workflowVersion"]
    workflow_run_name = event["workflowRunName"]
    payload_version = event["payloadVersion"]
    portal_run_id = event["portalRunId"]
    instrument_run_id = event["instrumentRunId"]
    primary_data_output_uri = event["primaryDataOutputUri"]
    libraries = event["libraries"]
    workflow_output_uri_prefix = event["workflowOutputPrefix"]
    workflow_logs_uri_prefix = event["workflowLogsPrefix"]

    # Construct the output payload
    return {
        "bclconvertInterOpQcEventDetail": {
          # Workflow run status
          "status": READY_STATUS,
          # Timestamp of the event
          "timestamp": datetime.now(timezone.utc).isoformat(timespec='seconds').replace("+00:00", 'Z'),
          # Portal Run ID For the BSSH Fastq Copy Manager
          "portalRunId": portal_run_id,  # pragma: allowlist secret
          # Workflow
          "workflow": {
              # Workflow name
              "name": workflow_name,
              # Workflow version
              "version": workflow_version
          },
          # Workflow run name
          "workflowRunName": workflow_run_name,
          # Linked libraries in the instrument run
          "libraries": libraries,
          "payload": {
            "version": payload_version,
            "data": {
              # Original inputs from READY State
              "inputs": {
                # The instrument run ID is used to identify the BCLConvert InterOp QC Manager workflow
                # We get this from the BSSH Fastq To AWS S3 Copy Succeeded Event payload.data.inputs.instrumentRunId
                "instrumentRunId": instrument_run_id,
                # InterOp Directory
                # Collected from the payload.data.outputs.outputUri + 'InterOp/'
                "interOpDirectory": primary_data_output_uri + "InterOp/",
                # BCLConvert Report Directory
                # Collected from the payload.data.outputs.outputUri + 'Reports/'
                "bclConvertReportDirectory": primary_data_output_uri + "Reports/"
              },
              # The engine parameters are used to launch the BCLConvert InterOp QC Manager workflow on ICAv2
              "engineParameters": {
                # The output URI is used to identify the BCLConvert InterOp QC Manager workflow
                "outputUri": workflow_output_uri_prefix + portal_run_id + "/",
                # This is where the ICA Logs will be stored
                "logsUri": workflow_logs_uri_prefix + portal_run_id + "/",
              },
              # Tags (same as bssh fastq to aws s3 copy succeeded event)
              "tags": {
               "instrumentRunId": instrument_run_id
              }
            }
          }
        }
    }
