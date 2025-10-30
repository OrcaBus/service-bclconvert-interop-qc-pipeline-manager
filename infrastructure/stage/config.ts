import {
  PAYLOAD_VERSION,
  SSM_PARAMETER_PATH_ICAV2_PROJECT_ID,
  SSM_PARAMETER_PATH_LOGS_PREFIX,
  SSM_PARAMETER_PATH_OUTPUT_PREFIX,
  SSM_PARAMETER_PATH_PAYLOAD_VERSION,
  SSM_PARAMETER_PATH_PREFIX_PIPELINE_IDS_BY_WORKFLOW_VERSION,
  SSM_PARAMETER_PATH_WORKFLOW_NAME,
  SSM_PARAMETER_PATH_WORKFLOW_VERSION,
  WORKFLOW_VERSION,
  WORKFLOW_LOGS_PREFIX,
  WORKFLOW_NAME,
  WORKFLOW_OUTPUT_PREFIX,
  WORKFLOW_VERSION_TO_DEFAULT_ICAV2_PIPELINE_ID_MAP,
  EVENT_BUS_NAME,
  EVENT_SOURCE,
  WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE,
  ICAV2_WES_REQUEST_DETAIL_TYPE,
  ICAV2_WES_STATE_CHANGE_DETAIL_TYPE,
  SSM_PARAMETER_PATH_PREFIX,
  WORKFLOW_CACHE_PREFIX,
  SSM_PARAMETER_PATH_CACHE_PREFIX,
} from './constants';
import { StatefulApplicationStackConfig, StatelessApplicationStackConfig } from './interfaces';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import {
  ICAV2_ACCESS_TOKEN_SECRET_ID,
  ICAV2_PROJECT_ID,
} from '@orcabus/platform-cdk-constructs/shared-config/icav2';
import { substituteBucketConstants } from './utils';
import { SsmParameterPaths, SsmParameterValues } from './ssm/interfaces';

const getSsmParameterPaths = (): SsmParameterPaths => {
  return {
    // Top level SSM parameter paths
    ssmRootPrefix: SSM_PARAMETER_PATH_PREFIX,

    // Detail level
    workflowName: SSM_PARAMETER_PATH_WORKFLOW_NAME,
    workflowVersion: SSM_PARAMETER_PATH_WORKFLOW_VERSION,

    // Payload
    payloadVersion: SSM_PARAMETER_PATH_PAYLOAD_VERSION,

    // Engine parameters
    prefixPipelineIdsByWorkflowVersion: SSM_PARAMETER_PATH_PREFIX_PIPELINE_IDS_BY_WORKFLOW_VERSION,
    icav2ProjectId: SSM_PARAMETER_PATH_ICAV2_PROJECT_ID,
    logsPrefix: SSM_PARAMETER_PATH_LOGS_PREFIX,
    outputPrefix: SSM_PARAMETER_PATH_OUTPUT_PREFIX,
    cachePrefix: SSM_PARAMETER_PATH_CACHE_PREFIX,
  };
};

const getSsmParameterValues = (stage: StageName): SsmParameterValues => {
  return {
    // Detail
    workflowName: WORKFLOW_NAME,
    workflowVersion: WORKFLOW_VERSION,

    // Payload
    payloadVersion: PAYLOAD_VERSION,

    // Engine parameters
    pipelineIdsByWorkflowVersionMap: WORKFLOW_VERSION_TO_DEFAULT_ICAV2_PIPELINE_ID_MAP,
    icav2ProjectId: ICAV2_PROJECT_ID[stage],
    outputPrefix: substituteBucketConstants(WORKFLOW_OUTPUT_PREFIX, stage),
    logsPrefix: substituteBucketConstants(WORKFLOW_LOGS_PREFIX, stage),
    cachePrefix: substituteBucketConstants(WORKFLOW_CACHE_PREFIX, stage),
  };
};
/**
 * Stateful stack properties for the workflow.
 * Mainly just linking values from SSM parameters
 * @param stage
 */
export const getStatefulStackProps = (stage: StageName): StatefulApplicationStackConfig => {
  return {
    // Keys
    ssmParameterPaths: getSsmParameterPaths(),

    // Values
    ssmParameterValues: getSsmParameterValues(stage),
  };
};

export const getStatelessStackProps = (stage: StageName): StatelessApplicationStackConfig => {
  return {
    // SSM Parameter Paths
    ssmParameterPaths: getSsmParameterPaths(),

    // Sending event rule stuff
    workflowRunStateChangeDetailType: WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE,
    icav2WesRequestDetailType: ICAV2_WES_REQUEST_DETAIL_TYPE,

    // Event Rule stuff
    workflowName: WORKFLOW_NAME,
    eventBusName: EVENT_BUS_NAME,
    eventSource: EVENT_SOURCE,
    icav2WesStateChangeDetailType: ICAV2_WES_STATE_CHANGE_DETAIL_TYPE,

    // Secret stuff
    icav2AccessTokenSecretId: ICAV2_ACCESS_TOKEN_SECRET_ID[stage],
  };
};
