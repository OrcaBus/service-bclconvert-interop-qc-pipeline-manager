# BCLConvert InterOp QC Manager

## Table of Contents <!-- omit in toc -->

- [Description](#description)
  - [Ready Event Creation](#ready-event-creation)
  - [Consumed Events](#consumed-events)
  - [Published Events](#published-events)
  - [Draft Events](#draft-events)
    - [Draft Event Submission](#draft-event-submission)
    - [Draft Data Schema Validation](#draft-data-schema-validation)
  - [Release Management](#release-management)
  - [Related Services](#related-services)
    - [Upstream Pipelines](#upstream-pipelines)
    - [Primary Services Used](#primary-services-used)
- [Infrastructure \& Deployment](#infrastructure--deployment)
  - [Stateful](#stateful)
  - [Stateless](#stateless)
  - [CDK Commands](#cdk-commands)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Setup](#setup)
    - [Requirements](#requirements)
    - [Install Dependencies](#install-dependencies)
  - [Conventions](#conventions)
  - [Linting \& Formatting](#linting--formatting)
  - [Testing](#testing)
- [Glossary \& References](#glossary--references)

## Description

This is the BCLConvert InterOp QC Manager service, resposible for
managing and orchestrating the BCLConvert InterOp QC workflow on ICA.

The BCLConvert InterOp QC Manager performs the following tasks:

* Listen to draft events from the workflow manager for BCLConvert InterOp QC.
    * Populate the event with the required inputs and engine parameters to launch the BCLConvert InterOp QC Manager
      workflow on ICAv2.
    * Find all the relevant fastq objects on the run and collect/generate multiqc-parquet files.
        * We use the fastq sync manager to ensure that the multiqc-parquet files exist before proceeding.
    * Pull in these multiqc parquet files into the cache directory, with the fastq id renamed to the library id.

* Listen to draft events from the workflow manager for BCLConvert InterOp QC.
    * If the event data is full, convert this into a READY event.

* Listen to BCLConvert InterOp QC Manager READY events from the workflow manager.
    * Send a request to the ICAv2 WES manager to launch the BCLConvert InterOp QC Manager workflow on ICAv2.

* Listen to events from the ICAv2 WES Manager, and convert these into Workflow Run State Change events for the workflow
  manager.

### Ready Event Creation

![Events Diagram](docs/drawio-exports/draft-to-ready.drawio.svg)

### Consumed Events

| Name / DetailType             | Source                    | Schema Link                                                                                                                                | Description                           |
|-------------------------------|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| `WorkflowRunStateChange`      | `orcabus.workflowmanager` | [WorkflowRunStateChange](https://github.com/OrcaBus/wiki/tree/main/orcabus-platform#workflowrunstatechange)                                | Source of updates on WorkflowRuns     |
| `Icav2WesAnalysisStateChange` | `orcabus.icav2wes`        | [Icav2WesAnalysisStateChange](https://github.com/OrcaBus/service-icav2-wes-manager/blob/main/app/event-schemas/analysis-state-change.json) | ICAv2 WES Analysis State Change event |

### Published Events

| Name / DetailType   | Source                        | Schema Link                                                                                                                                    | Description                    |
|---------------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| `WorkflowRunUpdate` | `orcabus.bclconvertinteropqc` | [WorkflowRunUpdate](https://github.com/OrcaBus/service-workflow-manager/blob/main/docs/events/WorkflowRunUpdate/WorkflowRunUpdate.schema.json) | Announces Workflow Run Updates |

### Draft Events

A workflow run must be placed into a DRAFT state before it can be started.

This is to ensure that only valid workflow runs are started, and that all required data is present.

This service is responsible for both populating and validating draft workflow runs.

A draft event may even be submitted without a payload.

#### Draft Event Submission

To submit a BCLConvert InterOp QC Draft event, please follow the [PM.BIQ.1 SOP](docs/operation/SOP/README.md#PM.BIQ.1)
in our SOPs documentation.

#### Draft Data Schema Validation

We have generated JSON schemas for the complete DRAFT WRU event **data** which you can find in the
[`app/event-schemas` directory](app/event-schemas).

You can interactively check if your DRAFT event data payload matches the schema using the following links:

- [Complete DRAFT WRU Event Data Schema Page](https://www.jsonschemavalidator.net/s/gRdv0Lad)

### Release Management

The service employs a fully automated CI/CD pipeline that
automatically builds and releases all changes to the `main` code branch.

### Related Services

#### Upstream Pipelines

- [BCLConvert](https://github.com/OrcaBus/service-bclconvert-manager)
- [Analysis Glue](https://github.com/OrcaBus/service-analysis-glue)

#### Primary Services Used

- [ICAv2 WES Manager](https://github.com/OrcaBus/service-icav2-wes-manager)
- [Fastq Manager](https://github.com/OrcaBus/service-fastq-manager)
- [Workflow Manager](https://github.com/OrcaBus/service-workflow-manager)

## Infrastructure & Deployment

> Deployment settings / configuration (e.g. CodePipeline(s) / automated builds).

Infrastructure and deployment are managed via CDK.
This template provides two types of CDK entry points: `cdk-stateless` and `cdk-stateful`.

### Stateful

- SSM Parameters
- Event Schemas

### Stateless

- Lambdas
- ECS Fargate Task
  - (for translating the fastq manager's sequali parquet file into a generic input for MultiQC)
- Step Functions
- Event Rules
- Event Targets (connecting event rules to StepFunctions)


### CDK Commands

You can access CDK commands using the `pnpm` wrapper script.

- **`cdk-stateless`**: Used to deploy stacks containing stateless resources (e.g., AWS Lambda), which can be easily
  redeployed without side effects.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where
  redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct
stack is executed based on the provided context.

For example:

```sh
pnpm cdk-stateful ls
pnpm cdk-stateless ls
```

Output

```sh
# Stateful
StatefulBclConvertInteropQc
StatefulBclConvertInteropQc/StatefulBclConvertInteropQc/OrcaBusBeta/OrcaBus-BclconvertInteropQc-StatefulMicroservice (OrcaBusBeta-OrcaBus-BclconvertInteropQc-StatefulMicroservice)
StatefulBclConvertInteropQc/StatefulBclConvertInteropQc/OrcaBusGamma/OrcaBus-BclconvertInteropQc-StatefulMicroservice (OrcaBusGamma-OrcaBus-BclconvertInteropQc-StatefulMicroservice)
StatefulBclConvertInteropQc/StatefulBclConvertInteropQc/OrcaBusProd/OrcaBus-BclconvertInteropQc-StatefulMicroservice (OrcaBusProd-OrcaBus-BclconvertInteropQc-StatefulMicroservice)
# Stateless
StatelessBclConvertInteropQc
StatelessBclConvertInteropQc/StatelessBclConvertInteropQcStack/OrcaBusBeta/OrcaBus-BclconvertInteropQc-StatelessMicroservice (OrcaBusBeta-OrcaBus-BclconvertInteropQc-StatelessMicroservice)
StatelessBclConvertInteropQc/StatelessBclConvertInteropQcStack/OrcaBusGamma/OrcaBus-BclconvertInteropQc-StatelessMicroservice (OrcaBusGamma-OrcaBus-BclconvertInteropQc-StatelessMicroservice)
StatelessBclConvertInteropQc/StatelessBclConvertInteropQcStack/OrcaBusProd/OrcaBus-BclconvertInteropQc-StatelessMicroservice (OrcaBusProd-OrcaBus-BclconvertInteropQc-StatelessMicroservice)
```


## Development

### Project Structure

The root of the project is an AWS CDK project where the main application logic lives inside the `./app` folder.

The project is organized into the following key directories:

- **`./app`**:
  - Contains the main application logic (lambdas / step functions / event schemas).

- **`./bin/deploy.ts`**:
  - Serves as the entry point of the application.
  - It initializes two root stacks: `stateless` and `stateful`.

- **`./infrastructure`**: Contains the infrastructure code for the project:
    - **`./infrastructure/toolchain`**: Includes stacks for the stateless and stateful resources deployed in the toolchain account.
      - These stacks primarily set up the CodePipeline for cross-environment deployments.
    - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
        - **`./infrastructure/stage/interfaces`**: The TypeScript interfaces used across constants, and stack configurations.
        - **`./infrastructure/stage/constants.ts`**: Constants used across different stacks and stages.
        - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`,
          `gamma`, `prod`).
        - **`./infrastructure/stage/stateful-application-stack.ts`**: The CDK stack entry point for provisioning resources required by the
          application in `./app`.
        - **`./infrastructure/stage/stateless-application-stack.ts`**: The CDK stack entry point for provisioning stateless resources required by the
          application in `./app`.
        - **`./infrastructure/stage/<aws-service-constructs>/`**: Contains AWS service-specific constructs used in the stacks.
          - Each AWS service construct is called from either the `stateful-application-stack.ts` or `stateless-application-stack.ts`.
          - Each AWS service folder contains an `index.ts` and `interfaces.ts` file.

- **`.github/workflows/pr-tests.yml`**:
  - Configures GitHub Actions to run tests for `make check` (linting and code
    style), tests defined in `./test`.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`.

### Setup

#### Requirements

```sh
node --version
v22.9.0

# Update Corepack (if necessary, as per pnpm documentation)
npm install --global corepack@latest

# Enable Corepack to use pnpm
corepack enable pnpm

```

#### Install Dependencies

To install all required dependencies, run:

```sh
make install
```

### Conventions

### Linting & Formatting

Automated checks are enforced via pre-commit hooks, ensuring only checked code is committed. For details consult the
`.pre-commit-config.yaml` file.

Manual, on-demand checking is also available via `make` targets (see below). For details consult the `Makefile` in the
root of the project.

To run linting and formatting checks on the root project, use:

```sh
make check
```

To automatically fix issues with ESLint and Prettier, run:

```sh
make fix
```

### Testing

Unit tests are available for most of the business logic. Test code is hosted alongside business in `/tests/` directories.

```sh
make test
```

## Glossary & References

For general terms and expressions used across OrcaBus services, please see the
platform [documentation](https://github.com/OrcaBus/wiki/blob/main/orcabus-platform/README.md#glossary--references).
