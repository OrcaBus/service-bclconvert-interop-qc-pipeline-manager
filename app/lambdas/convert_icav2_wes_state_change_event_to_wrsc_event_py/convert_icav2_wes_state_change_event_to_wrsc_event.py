#!/usr/bin/env python3

"""
Convert ICAv2 WES State Change Event to WRSC Event

Given an ICAv2 WES State Change Event, this script converts it to a WRSC Event.

{
  "id": "iwa.01JWAGE5PWS5JN48VWNPYSTJRN",
  "name": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
  "inputs": {
    "bclconvert_report_directory": {
      "class": "Directory",
      "location": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/Reports/"
    },
    "interop_directory": {
      "class": "Directory",
      "location": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/InterOp/"
    },
    "instrument_run_id": "20231010_pi1-07_0329_A222N7LTD3"
  },
  "engineParameters": {
    "pipelineId": "55a8bb47-d32b-48dd-9eac-373fd487ccec",
    "projectId": "ea19a3f5-ec7c-4940-a474-c31cd91dbad4",
    "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/test_data/bclconvert-interop-qc-test/",
    "logsUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/test_data/logs/bclconvert-interop-qc-test/"
  },
  "tags": {
    "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3",
    "portalRunId": "20250417abcd1234"  // pragma: allowlist secret
  },
  "status": "SUBMITTED",
  "submissionTime": "2025-05-28T03:54:35.612655",
  "stepsLaunchExecutionArn": "arn:aws:states:ap-southeast-2:843407916570:execution:icav2-wes-launchIcav2Analysis:3f176fc2-d8e0-4bd5-8d2f-f625d16f6bf6",
  "icav2AnalysisId": null,
  "startTime": "2025-05-28T03:54:35.662401+00:00",
  "endTime": null
}

TO

{
  // Workflow run status
  "status": "RUNNING",
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
        // The ICAv2 Project ID we use to launch the workflow
        "projectId": "uuid4",
        // Pipeline Id
        "pipelineId": "uuid4",
        // ICAv2 Analysis Id
        "analysisId": "uuid4",
        // The ICAv2 WES Analysis OrcaBus ID
        "icav2WesAnalysisOrcaBusId": "iwa.01JWAGE5PWS5JN48VWNPYSTJRN"
      },
      // Tags (same as bssh fastq to aws s3 copy succeeded event)
      "tags": {
       "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
      }
    }
  }
}
"""

# Standard imports
from datetime import datetime, timezone

# Custom imports
from orcabus_api_tools.workflow import (
    get_workflow_run_from_portal_run_id,
    get_latest_payload_from_workflow_run
)

def handler(event, context):
    """
    Perform the following steps:
    1. Get portal run ID from ICAv2 WES Event Tags
    2. Look up workflow run / payload using the portal run ID
    3. Generate the WRSC Event payload based on the existing WRSC Event payload
    :param event:
    :param context:
    :return:
    """

    # ICAV2 WES State Change Event payload
    icav2_wes_event = event['icav2WesStateChangeEvent']

    # Get the output URI from the engine parameters
    output_uri = icav2_wes_event['engineParameters']['outputUri']

    # Check if the status was SUCCEEDED, if so we populate the 'outputs' data payload
    if icav2_wes_event['status'] == 'SUCCEEDED':
        outputs = {
            'interOpSummaryDir': output_uri + 'interop_summary_files/',
            'multiQcOutputDir': output_uri + 'multiqc/',
            'multiQcHtmlReportUri': output_uri + 'multiqc/' + icav2_wes_event['tags']['instrumentRunId'] + '_multiqc_report.html',
            'multiQcQlimsCsvReportUri': output_uri + icav2_wes_event['tags']['instrumentRunId'] + '_multiqc_bclconvert_summary_qlims.csv',
        }
    else:
        outputs = None

    # Get the portal run ID from the event tags
    portal_run_id = icav2_wes_event['tags']['portalRunId']

    # Get the workflow run using the portal run ID
    workflow_run = get_workflow_run_from_portal_run_id(portal_run_id)

    # Get the latest payload from the workflow run
    latest_payload = get_latest_payload_from_workflow_run(workflow_run['orcabusId'])

    # Update the latest payload with the outputs if available
    if outputs:
        latest_payload['data']['outputs'] = outputs

    # Prepare the WRSC Event payload
    return {
        "workflowRunStateChangeEvent": {
            # New status
            "status": icav2_wes_event['status'],
            # Current time
            "timestamp": datetime.now(timezone.utc).isoformat(timespec='seconds').replace("+00:00", "Z"),
            # Portal Run ID
            "portalRunId": portal_run_id,
            # Workflow details
            "workflowName": workflow_run['workflow']['workflowName'],
            "workflowVersion": workflow_run['workflow']['workflowVersion'],
            "workflowRunName": workflow_run['workflowRunName'],
            # Linked libraries in workflow run
            "linkedLibraries": workflow_run['libraries'],
            # Payload containing the original inputs and engine parameters
            # But with the updated outputs if available
            "payload": {
                "version": latest_payload['version'],
                "data": latest_payload['data']
            }
        }
    }
