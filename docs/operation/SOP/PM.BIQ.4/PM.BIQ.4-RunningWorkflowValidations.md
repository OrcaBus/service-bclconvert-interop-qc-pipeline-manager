# Running Workflow Validations

- Version: 1.0
- Contact: Alexis Lucattini, [alexisl@unimelb.edu.au](mailto:alexisl@unimelb.edu.au)

This SOP describes how to verify a new version of the BCLConvert InterOp QC pipeline before promoting it to production.

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Procedure](#procedure)
  - [Select Test Instrument Run](#select-test-instrument-run)
  - [Submit Validation Run](#submit-validation-run)
  - [Monitor and Verify](#monitor-and-verify)
- [Success Criteria](#success-criteria)

## Overview

Before deploying a new version of the pipeline to production, it must be validated against known test data to ensure correctness. The validation process runs the pipeline end-to-end and verifies the outputs.

## Prerequisites

- New pipeline version deployed to the development/beta environment (see [PM.BIQ.2][new_pipeline_deployment_sop])
- AWS credentials for the beta environment
- Access to the OrcaBus Portal (PORTAL_TOKEN set in environment)

## Procedure

### Select Test Instrument Run

Choose an instrument run ID that has been previously processed and has known good results. This provides a baseline for comparison.

Good candidates include:

- Recent production runs that succeeded without issues
- Designated validation instrument runs with known expected outputs

### Submit Validation Run

Follow the [Manual Pipeline Execution SOP][manual_pipeline_execution_sop] to submit a DRAFT event for the selected instrument run, targeting the new pipeline version:

```shell
bash generate-WRU-draft.sh \
  --comment 'Validation run for version <new_version>' \
  <instrument_run_id>
```

If testing a specific pipeline ID (e.g. a DRAFT pipeline on ICAv2), include the pipeline ID override in the payload.

### Monitor and Verify

1. Monitor the workflow run in the [OrcaBus Portal](https://portal.umccr.org/runs/workflow)
2. Wait for the run to reach SUCCEEDED status
3. Compare outputs against baseline results

## Success Criteria

The validation run is considered successful if:

1. The workflow run completes with SUCCEEDED status
2. MultiQC report is generated with expected metrics
3. Output file structure matches expectations
4. No unexpected warnings or errors in execution logs

[new_pipeline_deployment_sop]: ../PM.BIQ.2/PM.BIQ.2-NewPipelineDeployment.md
[manual_pipeline_execution_sop]: ../PM.BIQ.1/PM.BIQ.1-ManualPipelineExecution.md
