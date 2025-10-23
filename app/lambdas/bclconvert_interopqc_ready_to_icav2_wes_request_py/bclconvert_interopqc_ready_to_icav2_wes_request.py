#!/usr/bin/env python3

"""
BCLConvert InteropQC ready to ICAv2 WES request

Given a BCLConvert InteropQC ready event object, convert this to an ICAv2 WES request event detail

Inputs are as follows:

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

With the outputs as follows:

{
  // The workflow run name
  "name": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
  "inputs": {
    // Because this runs as a CWL workflow, we need to provide the inputs in a specific format
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
  // The engine parameters are used to launch the BCLConvert InterOp QC Manager workflow on ICAv2
  "engineParameters": {
    // The output URI is used to identify the BCLConvert InterOp QC Manager workflow
    "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/analysis/bclconvert-interop-qc/20250417abcd1234/",
    // This is where the ICA Logs will be stored
    "logsUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/logs/bclconvert-interop-qc/20250417abcd1234/",
    // The ICAv2 Project ID we use to launch the workflow
    // Provided in the READY event
    // If not we can collect this from the platform cdk constructs
    "projectId": "uuid4",
    // Pipeline Id
    // Provided in the READY event
    // If not we can collect this from the platform cdk constructs
    "pipelineId": "uuid4"
  },
  // Tags (same as bssh fastq to aws s3 copy succeeded event)
  "tags": {
   "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
  }
}

We also get the optional default inputs from SSM, the pipeline id and the project id

"""

from typing import Dict, Any


def handler(event, context) -> Dict[str, Any]:
    """
    Convert the BCLConvert InteropQC ready event to an ICAv2 WES request event detail.
    :param event:
    :param context:
    :return:
    """
    event_detail_body = event['readyEventDetail']
    parquet_file_uri_list = event['parquetFileUriList']

    # Extract the inputs from the event detail body
    return {
        "icav2WesRequestEventDetail": {
            "name": event_detail_body['workflowRunName'],
            "inputs": {
                # Mandatory data inputs
                "bclconvert_report_directory": {
                    "class": "Directory",
                    "location": event_detail_body['payload']['data']['inputs']['bclConvertReportDirectory']
                },
                "interop_directory": {
                    "class": "Directory",
                    "location": event_detail_body['payload']['data']['inputs']['interOpDirectory']
                },
                "instrument_run_id": event_detail_body['payload']['data']['inputs']['instrumentRunId'],
                # Add in the parquet file uris
                "additional_parquet_files": list(map(
                    lambda uri: {
                        "class": "File",
                        "location": uri
                    },
                    parquet_file_uri_list
                ))
            },
            "engineParameters": event_detail_body['payload']['data']['engineParameters'],
            "tags": event_detail_body['payload']['data']['tags']
        }
    }


# if __name__ == "__main__":
#     import json
#
#     print(
#         json.dumps(
#             handler(
#                 event={
#                     "bclconvertInteropQcReadyEventDetail": {
#                         # Workflow run status
#                         "status": "READY",
#                         # Timestamp of the event
#                         "timestamp": "2025-04-22T00:09:07.220Z",
#                         # Portal Run ID For the BSSH Fastq Copy Manager
#                         "portalRunId": "20250417abcd1234",  # pragma: allowlist secret
#                         # Workflow name
#                         "workflowName": "bclconvert-interop-qc",
#                         # Workflow version
#                         "workflowVersion": "2025.05.24",
#                         # Workflow run name
#                         "workflowRunName": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
#                         # Linked libraries in the instrument run
#                         "linkedLibraries": [
#                             {
#                                 "orcabusId": "lib.12345",
#                                 "libraryId": "L20202020"
#                             }
#                         ],
#                         "payload": {
#                             "refId": "workflowmanagerrefid",
#                             "version": "2024.07.01",
#                             "data": {
#                                 # Original inputs from READY State
#                                 "inputs": {
#                                     # The instrument run ID is used to identify the BCLConvert InterOp QC Manager workflow
#                                     # We get this from the BSSH Fastq To AWS S3 Copy Succeeded Event payload.data.inputs.instrumentRunId
#                                     "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3",
#                                     # InterOp Directory
#                                     # Collected from the payload.data.outputs.outputUri + 'InterOp/'
#                                     "interOpDirectory": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/InterOp/",
#                                     # BCLConvert Report Directory
#                                     # Collected from the payload.data.outputs.outputUri + 'Reports/'
#                                     "bclConvertReportDirectory": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/Reports/"
#                                 },
#                                 # The engine parameters are used to launch the BCLConvert InterOp QC Manager workflow on ICAv2
#                                 "engineParameters": {
#                                     # The output URI is used to identify the BCLConvert InterOp QC Manager workflow
#                                     "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/analysis/bclconvert-interop-qc/20250417abcd1234/",
#                                     # This is where the ICA Logs will be stored
#                                     "logsUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/logs/bclconvert-interop-qc/20250417abcd1234/",
#                                 },
#                                 # Tags (same as bssh fastq to aws s3 copy succeeded event)
#                                 "tags": {
#                                     "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
#                                 }
#                             }
#                         },
#                     },
#                     "defaultPipelineId": "uuid4",
#                     "defaultProjectId": "uuid4"
#                 },
#                 context=None
#             ),
#             indent=4
#         )
#     )
#
#     # {
#     #     "icav2WesRequestEventDetail": {
#     #         "name": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
#     #         "inputs": {
#     #             "bclconvert_report_directory": {
#     #                 "class": "Directory",
#     #                 "location": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/Reports/"
#     #             },
#     #             "interop_directory": {
#     #                 "class": "Directory",
#     #                 "location": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/InterOp/"
#     #             },
#     #             "instrument_run_id": "20231010_pi1-07_0329_A222N7LTD3"
#     #         },
#     #         "engineParameters": {
#     #             "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/analysis/bclconvert-interop-qc/20250417abcd1234/",
#     #             "logsUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/logs/bclconvert-interop-qc/20250417abcd1234/",
#     #             "projectId": "uuid4",
#     #             "pipelineId": "uuid4"
#     #         },
#     #         "tags": {
#     #             "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3",
#     #             "portalRunId": "20250417abcd1234"  //  pragma: allowlist secret
#     #         }
#     #     }
#     # }
