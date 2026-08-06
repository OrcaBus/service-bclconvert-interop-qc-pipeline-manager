import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';

/**
 * Lambda function interface.
 */
export type LambdaNameList =
  // Shared Draft AND Ready lambdas
  | 'getFastqIdsInInstrumentRunId'
  | 'validateDraftDataCompleteSchema'
  | 'postSchemaValidation'
  // Draft to Ready
  | 'getBsshFastqOutputs'
  | 'getMultiqcParquetOutputsFromFastqIdList'
  | 'generateBclconvertInteropqcDraftDataEvent'
  | 'addSampleFilters'
  // Payload comparison and WRU generation
  | 'comparePayload'
  | 'generateWruEventObjectWithMergedData'
  | 'getMissingSchemaFields'
  // Commentary Functions
  | 'addPopulateDraftComment'
  | 'addReadyComment'
  // Ready to ICAv2 WES
  | 'bclconvertInteropqcReadyToIcav2WesRequest'
  | 'convertS3UriToIcav2Uri'
  | 'writeSampleFiltersFile'
  // Post Submitted
  | 'convertIcav2WesStateChangeEventToWrscEvent'
  | 'addWesFailureComment';

export const lambdaNameList: LambdaNameList[] = [
  // Shared Draft AND Ready lambdas
  'getFastqIdsInInstrumentRunId',
  'validateDraftDataCompleteSchema',
  'postSchemaValidation',
  // Draft to Ready
  'getBsshFastqOutputs',
  'getMultiqcParquetOutputsFromFastqIdList',
  'generateBclconvertInteropqcDraftDataEvent',
  'addSampleFilters',
  // Payload comparison and WRU generation
  'comparePayload',
  'generateWruEventObjectWithMergedData',
  'getMissingSchemaFields',
  // Commentary Functions
  'addPopulateDraftComment',
  'addReadyComment',
  // Ready to ICAv2 WES
  'bclconvertInteropqcReadyToIcav2WesRequest',
  'convertS3UriToIcav2Uri',
  'writeSampleFiltersFile',
  // Post Submitted
  'convertIcav2WesStateChangeEventToWrscEvent',
  'addWesFailureComment',
];

// Requirements interface for Lambda functions
export interface LambdaRequirements {
  needsOrcabusApiTools?: boolean;
  needsIcav2Tools?: boolean;
  needsHigherMemory?: boolean;
  needsSsmParametersAccess?: boolean;
  needsSchemaRegistryAccess?: boolean;
  needsExternalBucketInfo?: boolean;
  needsWorkflowInfo?: boolean;
  needsRepoUrl?: boolean;
}

// Lambda requirements mapping
export const lambdaRequirementsMap: Record<LambdaNameList, LambdaRequirements> = {
  // Shared Draft AND Ready lambdas
  getFastqIdsInInstrumentRunId: {
    needsOrcabusApiTools: true,
  },
  validateDraftDataCompleteSchema: {
    needsSsmParametersAccess: true,
    needsSchemaRegistryAccess: true,
  },
  postSchemaValidation: {
    needsOrcabusApiTools: true,
    needsIcav2Tools: true,
    needsExternalBucketInfo: true,
    needsWorkflowInfo: true,
  },
  // Draft to Ready
  getBsshFastqOutputs: {
    needsOrcabusApiTools: true,
  },
  getMultiqcParquetOutputsFromFastqIdList: {
    needsOrcabusApiTools: true,
  },
  generateBclconvertInteropqcDraftDataEvent: {
    needsOrcabusApiTools: true,
  },
  addSampleFilters: {
    needsOrcabusApiTools: true,
    needsHigherMemory: true,
  },
  // Payload comparison and WRU generation
  comparePayload: {},
  generateWruEventObjectWithMergedData: { needsOrcabusApiTools: true },
  getMissingSchemaFields: { needsSchemaRegistryAccess: true, needsSsmParametersAccess: true },
  // Commentary Functions
  addPopulateDraftComment: {
    needsOrcabusApiTools: true,
    needsWorkflowInfo: true,
    needsRepoUrl: true,
  },
  addReadyComment: {
    needsOrcabusApiTools: true,
    needsWorkflowInfo: true,
  },
  // Ready to ICAv2 WES
  bclconvertInteropqcReadyToIcav2WesRequest: {
    needsOrcabusApiTools: true,
  },
  convertS3UriToIcav2Uri: {
    needsIcav2Tools: true,
  },
  writeSampleFiltersFile: {
    needsIcav2Tools: true,
  },
  // Post Submitted
  convertIcav2WesStateChangeEventToWrscEvent: {
    needsOrcabusApiTools: true,
  },
  addWesFailureComment: { needsOrcabusApiTools: true, needsWorkflowInfo: true },
};

export interface LambdaInput {
  lambdaName: LambdaNameList;
}

export interface LambdaObject extends LambdaInput {
  lambdaFunction: PythonUvFunction;
}
