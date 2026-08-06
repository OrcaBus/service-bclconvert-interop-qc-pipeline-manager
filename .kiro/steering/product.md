# Product: BCLConvert Interop QC Pipeline Manager

## Summary

This is an OrcaBus microservice that manages the lifecycle of the **BCLConvert Interop QC pipeline** — a quality control pipeline that evaluates sequencing run quality by analysing BCLConvert demultiplexing metrics and Illumina InterOp data.

The service handles orchestration on ICAv2 (Illumina Connected Analytics v2) via CWL workflows. It follows the standard ICAv2-centric Pipeline Architecture used across OrcaBus. This is a non-downstream (top-level) service — it has no upstream pipeline dependencies and is triggered directly by sequencing run events.

## Core Responsibilities

- Accept `WorkflowRunStateChange` DRAFT events and validate/populate them into READY events
- Submit READY events to ICAv2 as `Icav2WesRequest` events via a Step Functions state machine
- Monitor ICAv2 analysis state changes and convert them to `WorkflowRunUpdate` events
- Validate draft schemas against a registered JSON schema before promotion
- Manage sample filter files for sequencing run QC via ECS tasks

## Event Flow

```
DRAFT event (WorkflowRunStateChange)
  → populate draft data (Step Functions)
  → validate draft schema
  → emit READY event
  → submit to ICAv2 WES
  → monitor ICAv2 state changes
  → emit WorkflowRunUpdate events
```

## Upstream / Downstream

- **Upstream**: None (top-level service — triggered directly by sequencing run events)
- **Downstream**: None
- **Key dependencies**: ICAv2 WES Manager, Workflow Manager

## Environments

Deploys to `beta`, `gamma`, and `prod` via AWS CodePipeline. The toolchain account hosts the CodePipeline; application stacks deploy cross-account.
