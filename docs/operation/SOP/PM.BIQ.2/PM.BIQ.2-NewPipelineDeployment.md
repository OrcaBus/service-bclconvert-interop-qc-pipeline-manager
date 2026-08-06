# New BCLConvert InterOp QC Pipeline Deployment

- Version: 1.0
- Contact: Alexis Lucattini, [alexisl@unimelb.edu.au](mailto:alexisl@unimelb.edu.au)

There may be times where we need to create a new CWL workflow for our BCLConvert InterOp QC pipeline.

In the SOP below we discuss the following scenarios:

- User wants to tinker with some parameters in the current CWL workflow for testing purposes only.
- User wants to add a new feature to the pipeline that requires a modification to the current CWL workflow.
- User wants to make a new release of the edited CWL workflow for production use.

Throughout the SOP we make the following expectations:

- User is familiar with UMCCR's [cwl-ica repository][cwl_ica_repo] and has a working knowledge of CWL.
- User has access to the ICAv2 platform with at minimum 'Contributor level' permissions in at least one project.
- User has access to the appropriate AWS Account tied to the ICAv2 project.

* [Pipeline Summary](#pipeline-summary)
* [Setup](#setup)
  - [Installing CWL-ICA-CLI](#installing-cwl-ica-cli)
  - [Installing ICAv2 CLI and ICAv2 CLI Plugins](#installing-icav2-cli-and-icav2-cli-plugins)
* [Development Deployment](#development-deployment)
  - [CWL ZIP](#cwl-zip)
  - [Pipeline Creation](#pipeline-creation)
  - [Running the Pipeline](#running-the-pipeline)
  - [Pipeline Update](#pipeline-update)
* [Production Deployment](#production-deployment)
  - [GitHub Releases](#github-releases)
  - [Infrastructure Constants Updates](#infrastructure-constants-updates)
  - [Workflow Manager Updates](#workflow-manager-updates)

## Pipeline Summary

The pipeline runs on [ICA][ica_about], using [CWL][cwl_user_guide] (Common Workflow Language) as the workflow orchestration language
to drive the pipeline. The CWL Workflow for BCLConvert InterOp QC is located in our [cwl-ica][cwl_ica_repo] repository.
And follows a 'release-based' auto-deployment into ICA for production use.

The BCLConvert InterOp QC pipeline performs the following major steps:

1. Collect BCLConvert demultiplexing metrics and Illumina InterOp data for the instrument run
2. Run MultiQC quality control analysis across the sequencing run data
3. Generate QC reports and metrics for downstream consumption

## Setup

### Installing CWL-ICA-CLI

Follow the instructions in the [cwl-ica-wiki][cwl_ica_installation_link].

### Installing ICAv2 CLI and ICAv2 CLI Plugins

Download and install the latest version of the ICAv2 CLI from the [ICAv2 CLI Releases page][icav2_releases_page].

Then also install the ICAv2 CLI Plugins from the [ICAv2 CLI Plugins installation page][icav2_plugins_installation_page].

## Development Deployment

For deployment into the development environment, we follow the philosophy of "this probably isn't going to work the first time",
and as such we want to be able to tinker with any workflow we create on the ICAv2 platform without having to create a new release every time.

ICAv2 supports pipelines in 'DRAFT' mode which can be edited at any time.

### CWL ZIP

The CWL workflow needs to be packaged into a ZIP file for deployment into ICA.

```shell
cwl-ica icav2-zip-workflow \
  --workflow-path workflows/bclconvert-interop-qc-pipeline/<version>/bclconvert-interop-qc-pipeline__<version>.cwl \
  --force
```

### Pipeline Creation

Once we have the ZIP file, we can deploy it into ICAv2:

```shell
icav2 projects enter development

icav2 projectpipelines create-cwl-pipeline-from-zip \
  bclconvert-interop-qc-pipeline__<version>.zip
```

Keep note of the pipeline ID outputted from the command above.

### Running the Pipeline

Once the pipeline is created, we can then run it on a test dataset.
See [SOP 1][sop_1_rel_path] for instructions on how to kick off the pipeline.

Note you will need to manually add in the following into the payload section of the WorkflowRunUpdate event:

```json5
{
  payload: {
    version: '<DEFAULT_PAYLOAD_VERSION>',
    data: {
      engineParameters: {
        pipelineId: '<THE PIPELINE ID YOU JUST CREATED>',
      },
    },
  },
}
```

### Pipeline Update

If the pipeline didn't work, update the CWL code and repeat:

1. Update the CWL code
2. Zip up the CWL code again using the `cwl-ica icav2-zip-workflow` command
3. Update the pipeline: `icav2 projectpipelines update bclconvert-interop-qc-pipeline__<version>.zip <pipeline_id>`
4. Rerun the pipeline

## Production Deployment

Once the pipeline is working in development:

1. Make a CWL-ICA GitHub release
2. Update the infrastructure constants in this repository
3. Register the workflow with the Workflow Manager

### GitHub Releases

Push the new cwl-ica code to a branch, have it reviewed and merged, then create a release:

```shell
cwl-ica workflow-release \
  --workflow-path workflows/bclconvert-interop-qc-pipeline/<version>/bclconvert-interop-qc-pipeline__<version>.cwl
```

### Infrastructure Constants Updates

Update the [infrastructure constants][infrastructure_constants_rel_path] with the new pipeline ID:

```typescript
export const WORKFLOW_VERSION_TO_DEFAULT_ICAV2_PIPELINE_ID_MAP: Record<
  WorkflowVersionType,
  string
> = {
  '<version>': '<THE PIPELINE ID>',
};
```

Make a PR, get it reviewed and merged. CodePipeline will deploy the changes.

### Workflow Manager Updates

Register the new workflow version with the Workflow Manager:

```shell
make-new-workflow.sh \
  --workflow-name 'bclconvert-interop-qc' \
  --workflow-version "<version>" \
  --executionEngine "ICA" \
  --executionEnginePipelineId "<PIPELINE_ID>" \
  --codeVersion "$(cd <cwl-ica-repo> && git rev-parse --short=7 HEAD)" \
  --validationState "VALIDATED"
```

[ica_about]: https://www.illumina.com/products/by-type/informatics-products/connected-analytics.html
[cwl_user_guide]: https://www.commonwl.org/user_guide/
[cwl_ica_repo]: https://github.com/umccr/cwl-ica
[cwl_ica_installation_link]: https://github.com/umccr/cwl-ica/wiki/Getting_Started#installation
[icav2_releases_page]: https://help.ica.illumina.com/command-line-interface/cli-installation
[icav2_plugins_installation_page]: https://github.com/umccr/icav2-cli-plugins/wiki#installation
[sop_1_rel_path]: ../PM.BIQ.1/PM.BIQ.1-ManualPipelineExecution.md
[infrastructure_constants_rel_path]: ../../../../infrastructure/stage/constants.ts
