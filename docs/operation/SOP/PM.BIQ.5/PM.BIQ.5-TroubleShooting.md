# Trouble Shooting

- Version: 1.0
- Contact: Alexis Lucattini, [alexisl@unimelb.edu.au](mailto:alexisl@unimelb.edu.au)


Most processes within the BCLConvert InterOp QC Orchestration use AWS Step Functions to manage the workflow.
We post all Step Function errors to the #alerts-prod slack channel, a Center staff member can
then click on the offending Step Function link in the slack message to be taken to the AWS Step Functions console to investigate further.

- [Analysis Stuck in DRAFT state](#analysis-stuck-in-draft-state)
  - [MultiQC Parquet Files Not Available](#multiqc-parquet-files-not-available)
  - [ECS Task Failure](#ecs-task-failure)
  - [Payload Mismatch](#payload-mismatch)
- [Analysis Stuck in READY state](#analysis-stuck-in-ready-state)
- [Analysis Fails to Start](#analysis-fails-to-start)
  - [Project Not Set Up Correctly](#project-not-set-up-correctly)
  - [Invalid Pipeline ID](#invalid-pipeline-id)
  - [Data Not Available](#data-not-available)
- [Common Pipeline Failures](#common-pipeline-failures)
  - [Sample Filter File Issues](#sample-filter-file-issues)


## Analysis Stuck in DRAFT state

If the analysis is stuck in DRAFT mode, there may be a couple of reasons for this.
To determine which issue is causing the problem we can head to the [AWS Step Functions Console][aws_step_functions_console_prod]
in the production account and look for any RUNNING executions in the 'bclconvert-interop-qc--populateDraftData' step function.

### MultiQC Parquet Files Not Available

The populate draft data state machine collects MultiQC parquet files from FASTQ data associated with the instrument run. If these files haven't been generated yet (e.g. the sequencing run is still in progress or the fastq sync hasn't completed), the state machine will wait.

Possible causes:
* Sequencing run is still in progress
* Fastq data hasn't been synced yet
* MultiQC parquet generation hasn't completed

Check the Fastq Manager service to confirm the status of the FASTQ data for the instrument run.

### ECS Task Failure

The ECS task that resamples MultiQC parquet files may fail due to:
* Insufficient memory for large instrument runs
* Network connectivity issues
* Corrupted input parquet files

Check the ECS task logs in CloudWatch for the specific error message.

### Payload Mismatch

If the most recent step function execution for this instrument run shows a validation failure,
check the CloudWatch Log Group for the 'validate-draft-payload' lambda.

This lambda will let you know how the payload violates the expected schema.
You may wish to then manually update the payload and generate a new WorkflowRunUpdate draft event as discussed in [SOP 1][sop_1_rel_path].

## Analysis Stuck in READY state

If the analysis is stuck in READY state, then it is likely that the translation from the READY event to the ICAv2 WES event has failed.
This is a rare occurrence, but may be due to transient issues with the ICAv2 WES manager.
One can confirm that this has occurred by querying the offending workflow run name against the [ICAv2 WES Manager API][icav2_wes_api_swagger_page].
If no analysis is found for that workflow run name, then the issue is likely due to a communication failure between the BCLConvert InterOp QC service
and the ICAv2 WES Manager.

## Analysis Fails to Start

The ICAv2 WES manager may fail to create an analysis for any of the following reasons:

### Project Not Set Up Correctly

This issue is mostly common with new projects. Some common things to confirm:

* Ensure that the ICAv2 Production Service User has been added to the project with the correct permissions.
* Ensure that the Notifications Channels have been set up correctly for the project.

Please consult the [project setup SOP][icav2_wes_project_setup_sop] as part of the ICAv2 WES documentation.

### Invalid Pipeline ID

> The pipeline id specified is not available in the project id

This can be mitigated with the following command from someone with ICAv2 access:

```
icav2 projects enter <project_id>
icav2 projectpipeline link <pipeline_id>
```

You will need to create a new workflow run after this change.

### Data Not Available

> Data .x. is not available in the project id <project_id>

If data is available via the S3 External Data Access Route from the ICAv2 WES manager, the WES manager will
use this route to access the data. If this is not possible, the data needs to be linked within ICAv2.

## Common Pipeline Failures

### Sample Filter File Issues

If the pipeline fails with errors related to sample filters:

* Check that the sample filter file was correctly generated and uploaded to S3
* Verify that all library IDs in the instrument run are valid
* Check that the cache URI is accessible from the ICAv2 project

Review the `write_sample_filters_file` and `add_sample_filters` Lambda logs for more details.


[aws_step_functions_console_prod]: https://472057503814.ap-southeast-2.console.aws.amazon.com/states/home?region=ap-southeast-2#/statemachines
[sop_1_rel_path]: ../PM.BIQ.1/PM.BIQ.1-ManualPipelineExecution.md
[icav2_wes_api_swagger_page]: https://icav2-wes.prod.umccr.org/schema/swagger-ui#/
[icav2_wes_project_setup_sop]: https://github.com/umccr/research-projects/tree/main/project-template/infrastructure
