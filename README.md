# BCLConvert InterOp QC Manager

## Overview

The BCLConvert InterOp QC Manager performs the following tasks:

* Listen to BSSH Fastq to AWS S3 Copy Succeeded Events from the workflow manager,
  and convert to BCLConvert InterOp QC Manager READY events, that are then relayed by the workflow manager.

* Listen to BCLConvert InterOp QC Manager READY events from the workflow manager,
  and convert these into ICAv2 WES Events, for launch of the BCLConvert InterOp QC Manager workflow on ICAv2. 

* Listen to events from the ICAv2 WES Manager, and convert these into Workflow Run State Change events for the workflow manager.


## Project Structure :construction:

The project is organized into the following key directories:

- **`./app`**: Contains the main application logic. You can open the code editor directly in this folder, and the application should run independently.

- **`./bin/deploy.ts`**: Serves as the entry point of the application. It initializes two root stacks: `stateless` and `stateful`. You can remove one of these if your service does not require it.

- **`./infrastructure`**: Contains the infrastructure code for the project:
  - **`./infrastructure/toolchain`**: Includes stacks for the stateless and stateful resources deployed in the toolchain account. These stacks primarily set up the CodePipeline for cross-environment deployments.
  - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
    - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`, `gamma`, `prod`).
    - **`./infrastructure/stage/stack.ts`**: The CDK stack entry point for provisioning resources required by the application in `./app`.

- **`.github/workflows/pr-tests.yml`**: Configures GitHub Actions to run tests for `make check` (linting and code style), tests defined in `./test`, and `make test` for the `./app` directory. Modify this file as needed to ensure the tests are properly configured for your environment.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`. You should modify these test files to match the resources defined in the `./infrastructure` folder.

## Events Diagram overview

![Events Diagram](docs/drawio-exports/bclconvert-interop-qc.drawio.svg)

## Step functions / Events overview

### BSSH Fastq to AWS S3 Copy Succeeded Event to BCLConvert InterOp QC Manager READY Event

Listen to the BSSH Fastq to AWS S3 Copy Succeeded Event from the workflow manager, and convert it to a BCLConvert InterOp QC Manager READY event. 
This event is then relayed by the workflow manager.

<details>

<summary>Click to expand!</summary>

```json5
{
  // Name of the event bus
  "EventBusName": "OrcaBusMain",  
  // Workflow Manager event type
  "DetailType": "WorkflowRunStateChange",
  // Event relayed by the workflow manager  
  "Source": "orcabus.workflowmanager",  
  "Detail": {
    // Workflow run status
    "status": "SUCCEEDED",  
    // Timestamp of the event
    "timestamp": "2025-04-22T00:09:07.220Z",
    // Portal Run ID For the BSSH Fastq Copy Manager  
    "portalRunId": "202504179cac7411",  // pragma: allowlist secret
    // Workflow name
    "workflowName": "bssh-fastq-to-aws-copy",
    // Workflow version  
    "workflowVersion": "2025.05.14",  
    // Workflow run name
    "workflowRunName": "umccr--automated--bssh-fastq-to-aws-copy--2024-05-24--202504179cac7411",  
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
          "bsshAnalysisId": "33aca803-6bd4-48ec-8443-150e52852053",
          "bsshProjectId": "a7c67a80-c8f2-4348-adec-3a5a073d1d55",
          "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
        },
        // Original outputs from READY state
        "engineParameters": {
          "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/"
        },
        // Added by the bssh fastq copy manager
        // And needed by downstream 'glues'
        // Hoping to delete the fastqListRowsB64gz attribute from the event
        // As soon as the clag glues can instead listen to the fastq glues
        "outputs": {
          "outputUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/20231010_pi1-07_0329_A222N7LTD3/202504179cac7411/",
          "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3",
          "fastqListRowsB64gz": "H4sIAJPdBmgC/92U0WvCMBDG/xXps2lyFzXWt1gxDDoZNnsaI0TNZqFqZp3gxv73pSCMjWL33Kd83H1H7oMf9/QZLdXdLJr0ojRVqVJax6mWQaU6hqjfC+38vm7r/GFOFhJwLMYE2JQsnb8asulNQ2b3Lhig9jq7gXlRusdjUc9UfEKpL7wri70jG3cma7veOjJkPBECxXAEI2I9qQ7vp62z1YkgXV0OK1Ks7RlpGHDlwe/c/kT9sdjZ44UiQw4MmPEFECYM45gYiYgLkekZr/tDNgCRhJ/EAIDmdudLV9F6TQO0MUZz1eRgMsbALMGEJ34JC77Frx/RNSl2MCn+TvrV7/0QJAM9qVQq1qkOMohWgrCNIOwGQdhcNTl2jaDWpLcI0lJqGRCKlVa1/McN4m0E8W4QxJurJuddI6g16V+Cnr8Bp+MZ4cYGAAA="  // pragma: allowlist secret
        },
        // Original tags from READY State
        "tags": {
         "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
        }
      }
    }
  }
}
```

</details>

And in turn we generate the following

```json5
{
  // Name of the event bus
  "EventBusName": "OrcaBusMain",  
  // Workflow Manager event type
  "DetailType": "WorkflowRunStateChange",
  // Event relayed by the workflow manager  
  "Source": "orcabus.workflowmanager",  
  "Detail": {
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
}
```

### BCLConvert InterOp QC Manager READY Event to ICAv2 WES Event

We listen to the BCLConvert InterOp QC Manager READY event from the workflow manager, and convert it into an ICAv2 WES Event.

The details of the READY event are shown above. 

For the ICAv2 WES Event, we generate the following:

<details>

<summary>Click to expand!</summary>


```json5
{
  // Name of the event bus
  "EventBusName": "OrcaBusMain",  
  // ICAv2 WES event type
  "DetailType": "Icav2WesAnalysisRequest",
  // Event relayed by the workflow manager  
  "Source": "orcabus.bclconvertinteropqcmanager",
  "Detail": {
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
}
```
</details>


### ICAv2 WES Event to Workflow Run State Change Event

Now we listen to events from the ICAv2 WES Manager, and convert these into Workflow Run State Change events for the workflow manager.

An example might be something like this:

<details>

<summary>Click to expand!</summary>

```json5
{
  "DetailType": "Icav2WesStateChange",
  "source": "orcabus.icav2wesmanager",
  "account": "843407916570",
  "time": "2025-05-28T03:54:35Z",
  "region": "ap-southeast-2",
  "resources": [],
  "detail": {
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
      "instrument_run_id": "20231010_pi1-07_0329_A222N7LTD3"
    },
    "status": "SUBMITTED",
    "submissionTime": "2025-05-28T03:54:35.612655",
    "stepsLaunchExecutionArn": "arn:aws:states:ap-southeast-2:843407916570:execution:icav2-wes-launchIcav2Analysis:3f176fc2-d8e0-4bd5-8d2f-f625d16f6bf6",
    "icav2AnalysisId": null,
    "startTime": "2025-05-28T03:54:35.662401+00:00",
    "endTime": null
  }
}
```

</details>


That we convert to a Workflow Run State Change event for the workflow manager, which looks like this:

<details>

<summary>Click to expand!</summary>

```json5
{
  // Name of the event bus
  "EventBusName": "OrcaBusMain",  
  // ICAv2 WES event type
  "DetailType": "Icav2WesAnalysisRequest",
  // Event relayed by the workflow manager  
  "Source": "orcabus.bclconvertinteropqcmanager",
  "Detail": {
    // The workflow run name
    // Which we use to query the workflow manager for the existing payload
    "name": "umccr--automated--bclconvert-interop-qc--2024-05-24--20250417abcd1234",
    // Inputs from the existing workflow manager state
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
      // We get this from the icav2 wes engine parameters
      "projectId": "uuid4",
      // We get this from the icav2 wes engine parameters
      "pipelineId": "uuid4",
      // If the icav2 analysis id has been set, we can include it here
      "analysisId": "uuid4",
      // We also return with the icav2 wes analysis orcabus id
      "icav2WesAnalysisOrcaBusId": "iwa.01JWAGE5PWS5JN48VWNPYSTJRN",
    },
    // Tags as provided in the existing workflow manager state
    "tags": {
     "instrumentRunId": "20231010_pi1-07_0329_A222N7LTD3"
    }
  }
}
```

</details>

## Setup :construction:

### Requirements

```sh
node --version
v22.9.0

# Update Corepack (if necessary, as per pnpm documentation)
npm install --global corepack@latest

# Enable Corepack to use pnpm
corepack enable pnpm

```

### Install Dependencies :construction:

To install all required dependencies, run:

```sh
make install
```

### First Steps :construction:

Before using this template, search for all instances of `TODO:` comments in the codebase and update them as appropriate for your service. This includes replacing placeholder values (such as stack names).

### CDK Commands :construction:

You can access CDK commands using the `pnpm` wrapper script.

This template provides two types of CDK entry points: `cdk-stateless` and `cdk-stateful`.

- **`cdk-stateless`**: Used to deploy stacks containing stateless resources (e.g., AWS Lambda), which can be easily redeployed without side effects.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct stack is executed based on the provided context.

For example:

```sh
# Deploy a stateless stack
pnpm cdk-stateless <command>

# Deploy a stateful stack
pnpm cdk-stateful <command>
```

### Stacks

This CDK project manages multiple stacks. The root stack (the only one that does not include `DeploymentPipeline` in its stack ID) is deployed in the toolchain account and sets up a CodePipeline for cross-environment deployments to `beta`, `gamma`, and `prod`.

To list all available stacks, run:

```sh
pnpm cdk-stateless ls
```

Example output:

```sh
OrcaBusStatelessServiceStack
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusBeta/DeployStack (OrcaBusBeta-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusGamma/DeployStack (OrcaBusGamma-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusProd/DeployStack (OrcaBusProd-DeployStack)
```

## Linting and Formatting :construction:

### Run Checks

To run linting and formatting checks on the root project, use:

```sh
make check
```

### Fix Issues  :construction:

To automatically fix issues with ESLint and Prettier, run:

```sh
make fix
```
