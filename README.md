# BCLConvert InterOp QC Manager

## Overview

The BCLConvert InterOp QC Manager performs the following tasks:

* Listen to draft events from the workflow manager for BCLConvert InterOp QC.
  * Populate the event with the required inputs and engine parameters to launch the BCLConvert InterOp QC Manager workflow on ICAv2.

* Listen to draft events from the workflow manager for BCLConvert InterOp QC.
  * If the event data is full, convert this into a READY event.

* Listen to BCLConvert InterOp QC Manager READY events from the workflow manager.
  * Find all the relevant fastq objects on the run and pull down their multiqc-parquet files.
  * Pull in these multiqc parquet files into the cache directory, with the fastq id renamed to the library id.
  * Send a request to the ICAv2 WES manager to launch the BCLConvert InterOp QC Manager workflow on ICAv2.

* Listen to events from the ICAv2 WES Manager, and convert these into Workflow Run State Change events for the workflow
  manager.

## Events Diagram overview

![Events Diagram](docs/drawio-exports/bclconvert-interop-qc.drawio.svg)

## Step functions / Events overview

### Populate Draft Data

Listen to the Workflow Manager for any draft events for the BCLConvert InterOp QC Manager workflow.

![Populate Draft Data](docs/workflow-studio-exports/populate-draft-data.svg)

### Validate Draft Data Event

![Validate Draft Data Event](docs/workflow-studio-exports/validate-draft-data-event.svg)

### READY Event to ICAv2 WES Event

We listen to the BCLConvert InterOp QC Manager READY event from the workflow manager, and convert it into an ICAv2 WES
Event.

This also involves finding all the relevant fastq objects on the run and pulling in their multiqc-parquet files.

We then submit the request to the ICAv2 WES Manager to launch the BCLConvert InterOp QC Manager workflow on ICAv2.

![Ready Event to ICAv2 WES Event](docs/workflow-studio-exports/ready-to-icav2-wes-submit-event.svg)


### ICAv2 WES Event to Workflow Run State Change Event

Now we listen to events from the ICAv2 WES Manager, and convert these into Workflow Run Update events for the
workflow manager.

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

Before using this template, search for all instances of `TODO:` comments in the codebase and update them as appropriate
for your service. This includes replacing placeholder values (such as stack names).

### CDK Commands :construction:

You can access CDK commands using the `pnpm` wrapper script.

This template provides two types of CDK entry points: `cdk-stateless` and `cdk-stateful`.

- **`cdk-stateless`**: Used to deploy stacks containing stateless resources (e.g., AWS Lambda), which can be easily
  redeployed without side effects.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where
  redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct
stack is executed based on the provided context.

For example:

```sh
# Deploy a stateless stack
pnpm cdk-stateless <command>

# Deploy a stateful stack
pnpm cdk-stateful <command>
```

### Stacks

This CDK project manages multiple stacks. The root stack (the only one that does not include `DeploymentPipeline` in its
stack ID) is deployed in the toolchain account and sets up a CodePipeline for cross-environment deployments to `beta`,
`gamma`, and `prod`.

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

## Project Structure :construction:

The project is organized into the following key directories:

- **`./app`**: Contains the main application logic. You can open the code editor directly in this folder, and the
  application should run independently.

- **`./bin/deploy.ts`**: Serves as the entry point of the application. It initializes two root stacks: `stateless` and
  `stateful`. You can remove one of these if your service does not require it.

- **`./infrastructure`**: Contains the infrastructure code for the project:
    - **`./infrastructure/toolchain`**: Includes stacks for the stateless and stateful resources deployed in the
      toolchain account. These stacks primarily set up the CodePipeline for cross-environment deployments.
    - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
        - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`,
          `gamma`, `prod`).
        - **`./infrastructure/stage/stack.ts`**: The CDK stack entry point for provisioning resources required by the
          application in `./app`.

- **`.github/workflows/pr-tests.yml`**: Configures GitHub Actions to run tests for `make check` (linting and code
  style), tests defined in `./test`, and `make test` for the `./app` directory. Modify this file as needed to ensure the
  tests are properly configured for your environment.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`. You should modify these test files to match
  the resources defined in the `./infrastructure` folder.

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
