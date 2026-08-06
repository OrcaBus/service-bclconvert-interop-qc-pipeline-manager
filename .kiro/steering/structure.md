# Project Structure

## Top-Level Layout

```
├── app/                        # Application logic (lambdas, ECS tasks, step functions, schemas)
├── bin/deploy.ts               # CDK entry point — initialises stateless + stateful root stacks
├── infrastructure/             # CDK infrastructure code
│   ├── stage/                  # Per-environment application stacks
│   └── toolchain/              # CodePipeline stacks (deploy to beta/gamma/prod)
├── test/                       # CDK/cdk-nag compliance tests
├── docs/                       # Draw.io exports, SOPs, workflow studio exports
├── .kiro/steering/             # AI steering documents
├── cdk.json                    # CDK app config (entry: `pnpx ts-node bin/deploy.ts`)
├── package.json / pnpm-workspace.yaml
└── Makefile                    # Common developer commands
```

## `app/` — Application Logic

```
app/
├── ecs/                        # ECS task definitions
│   └── resample_multiqc_parquet_file/  # Resamples MultiQC parquet files
├── event-schemas/              # JSON schemas for event validation
│   └── complete-data-draft/
│       ├── 2025.05.29/
│       │   └── complete-data-draft-schema.json
│       └── 2026.04.01/
│           └── complete-data-draft-schema.json
├── lambdas/                    # Python Lambda functions
│   ├── add_sample_filters_py/
│   ├── bclconvert_interopqc_ready_to_icav2_wes_request_py/
│   ├── convert_icav2_wes_state_change_event_to_wrsc_event_py/
│   ├── convert_s3_uri_to_icav2_uri_py/
│   ├── generate_bclconvert_interopqc_draft_data_event_py/
│   ├── get_bssh_fastq_outputs_py/
│   ├── get_fastq_ids_in_instrument_run_id_py/
│   ├── get_multiqc_parquet_outputs_from_fastq_id_list_py/
│   ├── validate_draft_data_complete_schema_py/
│   └── write_sample_filters_file_py/
└── step-functions-templates/   # ASL JSON Step Functions definitions
    ├── icav2_wes_event_to_wrsc_event_sfn_template.asl.json
    ├── populate_draft_data_sfn_template.asl.json
    ├── ready_event_to_icav2_wes_request_event_sfn_template.asl.json
    └── validate_draft_data_and_put_ready_event_sfn_template.asl.json
```

### Lambda Naming Convention

Lambda directories use `snake_case` with a `_py` suffix (e.g. `add_sample_filters_py`). The CDK infrastructure converts camelCase names to snake_case automatically via `camelCaseToSnakeCase()`.

### Lambda Pattern

- Single file per Lambda, named `<function_name>.py`
- Must export `handler(event, context) -> Dict[str, Any]`
- Extensive docstrings describing input/output event shapes
- Business logic only — no AWS SDK calls for infrastructure wiring (IAM, SSM lookups are CDK-managed)
- Commented-out `if __name__ == "__main__"` blocks for local testing

## `infrastructure/` — CDK Code

```
infrastructure/
├── stage/
│   ├── config.ts               # Environment configs (beta, gamma, prod)
│   ├── constants.ts            # All app constants (SSM paths, event names, workflow versions, S3 refs)
│   ├── interfaces.ts           # Shared TypeScript interfaces for the stack
│   ├── stateless-application-stack.ts
│   ├── stateful-application-stack.ts
│   ├── ecs/                    # ECS task construct builders
│   ├── lambda/                 # Lambda construct builders
│   │   ├── index.ts            # buildAllLambdas() — iterates lambdaNameList
│   │   └── interfaces.ts       # Lambda name list + requirements map
│   ├── step-functions/         # Step Function construct builders
│   ├── event-rules/            # EventBridge rule builders
│   ├── event-targets/          # EventBridge target builders
│   ├── event-schemas/          # Schema registry construct builders
│   ├── ssm/                    # SSM parameter construct builders
│   └── utils/                  # Shared utilities (camelCase ↔ kebab/snake conversions)
└── toolchain/
    ├── constants.ts            # Toolchain-specific constants
    ├── stateless-stack.ts      # CodePipeline for stateless deployments
    └── stateful-stack.ts       # CodePipeline for stateful deployments
```

### Infrastructure Patterns

- Each resource type (lambda, step-functions, event-rules, etc.) has its own `index.ts` (builder) and `interfaces.ts` (types)
- All constants (SSM paths, event names, bucket names, workflow versions) live in `infrastructure/stage/constants.ts` — do not hardcode these elsewhere
- Lambdas are built with `PythonUvFunction` from `@orcabus/platform-cdk-constructs`
- IAM permissions are granted inline in `infrastructure/stage/lambda/index.ts` based on per-Lambda requirement flags in `interfaces.ts`
- `NagSuppressions` are added inline with justification comments wherever `cdk-nag` rules are suppressed

## Key Conventions

- **Event source**: `orcabus.bclconvertinteropqc`
- **Event bus**: `OrcaBusMain`
- **SSM prefix**: `/orcabus/workflows/bclconvert-interop-qc/`
- **Stack prefix**: `orca-bclconvert-interop-qc`
- **Workflow name**: `bclconvert-interop-qc`
- **Lambda runtime**: Python 3.14 on ARM64
- When adding a new Lambda: add the directory under `app/lambdas/<name>_py/`, register it in `infrastructure/stage/lambda/interfaces.ts`, and declare its IAM requirement flags there
- When adding a new workflow version: update `WORKFLOW_VERSION_TO_DEFAULT_ICAV2_PIPELINE_ID_MAP` and related maps in `constants.ts`
