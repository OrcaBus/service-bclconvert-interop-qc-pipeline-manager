/* Directory constants */
import path from 'path';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { DATA_SCHEMA_REGISTRY_NAME } from '@orcabus/platform-cdk-constructs/shared-config/event-bridge';
import { WorkflowVersionType } from './interfaces';
export const APP_ROOT = path.join(__dirname, '../../app');
export const LAMBDA_DIR = path.join(APP_ROOT, 'lambdas');
export const STEP_FUNCTIONS_DIR = path.join(APP_ROOT, 'step-functions-templates');
export const ECS_DIR = path.join(APP_ROOT, 'ecs');
export const EVENT_SCHEMAS_DIR = path.join(APP_ROOT, 'event-schemas');

/* Workflow constants */
export const WORKFLOW_NAME = 'bclconvert-interop-qc';
export const WORKFLOW_VERSION: WorkflowVersionType = '1.5.0--1.31';
export const PAYLOAD_VERSION = '2025.05.29';
export const STACK_PREFIX = 'orca-bclconvert-interop-qc';

export const WORKFLOW_OUTPUT_PREFIX = `s3://{__CACHE_BUCKET__}/{__CACHE_PREFIX__}analysis/${WORKFLOW_NAME}/`;
export const WORKFLOW_LOGS_PREFIX = `s3://{__CACHE_BUCKET__}/{__CACHE_PREFIX__}logs/${WORKFLOW_NAME}/`;
export const WORKFLOW_CACHE_PREFIX = `s3://{__CACHE_BUCKET__}/{__CACHE_PREFIX__}cache/${WORKFLOW_NAME}/`;

/* We extend this every time we release a new version of the workflow */
/* This is added into our SSM Parameter Store to allow us to map workflow versions to pipeline IDs */
export const WORKFLOW_VERSION_TO_DEFAULT_ICAV2_PIPELINE_ID_MAP: Record<
  WorkflowVersionType,
  string
> = {
  // https://github.com/umccr/cwl-ica/releases/tag/bclconvert-interop-qc%2F1.3.1--1.25.2__20250805060609
  '1.3.1--1.25.2': '9a67bc07-b668-4aff-9ae8-fb4b52a19f4b',
  // https://github.com/umccr/cwl-ica/releases/tag/bclconvert-interop-qc%2F1.5.0--1.31__20251015013928
  '1.5.0--1.31': 'ebbcd07d-a030-4841-b2ad-ac985c776f36',
};

/* SSM Parameter Paths */
export const SSM_PARAMETER_PATH_PREFIX = path.join('/orcabus/workflows/bclconvert-interop-qc/');
export const SSM_PARAMETER_PATH_WORKFLOW_NAME = path.join(SSM_PARAMETER_PATH_PREFIX, WORKFLOW_NAME);
export const SSM_PARAMETER_PATH_WORKFLOW_VERSION = path.join(
  SSM_PARAMETER_PATH_PREFIX,
  WORKFLOW_VERSION
);
export const SSM_PARAMETER_PATH_PREFIX_PIPELINE_IDS_BY_WORKFLOW_VERSION = path.join(
  SSM_PARAMETER_PATH_PREFIX,
  'pipeline-ids-by-workflow-version'
);
export const SSM_PARAMETER_PATH_ICAV2_PROJECT_ID = path.join(
  SSM_PARAMETER_PATH_PREFIX,
  'icav2-project-id'
);
export const SSM_PARAMETER_PATH_PAYLOAD_VERSION = path.join(
  SSM_PARAMETER_PATH_PREFIX,
  'payload-version'
);
export const SSM_PARAMETER_PATH_LOGS_PREFIX = path.join(SSM_PARAMETER_PATH_PREFIX, 'logs-prefix');
export const SSM_PARAMETER_PATH_OUTPUT_PREFIX = path.join(
  SSM_PARAMETER_PATH_PREFIX,
  'output-prefix'
);
export const SSM_PARAMETER_PATH_CACHE_PREFIX = path.join(SSM_PARAMETER_PATH_PREFIX, 'cache-prefix');

/* Event Constants */
export const EVENT_BUS_NAME = 'OrcaBusMain';
export const EVENT_SOURCE = 'orcabus.bclconvertinteropqc';
export const WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE = 'WorkflowRunStateChange';
export const WORKFLOW_RUN_UPDATE_DETAIL_TYPE = 'WorkflowRunUpdate';
export const ICAV2_WES_REQUEST_DETAIL_TYPE = 'Icav2WesRequest';
export const ICAV2_WES_STATE_CHANGE_DETAIL_TYPE = 'Icav2WesAnalysisStateChange';
export const FASTQ_SYNC_DETAIL_TYPE = 'FastqSync';

export const WORKFLOW_MANAGER_EVENT_SOURCE = 'orcabus.workflowmanager';
export const ICAV2_WES_EVENT_SOURCE = 'orcabus.icav2wesmanager';

/* Event rule constants */
export const DRAFT_STATUS = 'DRAFT';
export const READY_STATUS = 'READY';

/* Schema constants */
export const SCHEMA_REGISTRY_NAME = DATA_SCHEMA_REGISTRY_NAME;
export const SSM_SCHEMA_ROOT = path.join(SSM_PARAMETER_PATH_PREFIX, 'schemas');

/* Future proofing */
export const NEW_WORKFLOW_MANAGER_IS_DEPLOYED: Record<StageName, boolean> = {
  BETA: true,
  GAMMA: true,
  PROD: false,
};
