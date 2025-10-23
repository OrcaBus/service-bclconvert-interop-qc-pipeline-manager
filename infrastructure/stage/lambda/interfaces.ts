import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';

/**
 * Lambda function interface.
 */
export type LambdaName =
  // Shared Draft AND Ready lambdas
  | 'getFastqIdsInInstrumentRunId'
  | 'validateDraftDataCompleteSchema'
  // Draft to Ready
  | 'getBsshFastqOutputs'
  | 'getMultiqcParquetOutputsFromFastqIdList'
  | 'generateBclconvertInteropqcDraftDataEvent'
  // Ready to ICAv2 WES
  | 'bclconvertInteropqcReadyToIcav2WesRequest'
  | 'convertS3UriToIcav2Uri'
  // Post Submitted
  | 'convertIcav2WesStateChangeEventToWrscEvent';

export const lambdaNameList: LambdaName[] = [
  // Shared Draft AND Ready lambdas
  'getFastqIdsInInstrumentRunId',
  'validateDraftDataCompleteSchema',
  // Draft to Ready
  'getBsshFastqOutputs',
  'getMultiqcParquetOutputsFromFastqIdList',
  'generateBclconvertInteropqcDraftDataEvent',
  // Ready to ICAv2 WES
  'bclconvertInteropqcReadyToIcav2WesRequest',
  'convertS3UriToIcav2Uri',
  // Post Submitted
  'convertIcav2WesStateChangeEventToWrscEvent',
];

// Requirements interface for Lambda functions
export interface LambdaRequirements {
  needsOrcabusApiTools?: boolean;
  needsIcav2Tools?: boolean;
  needsSsmParametersAccess?: boolean;
  needsSchemaRegistryAccess?: boolean;
}

// Lambda requirements mapping
export const lambdaRequirementsMap: Record<LambdaName, LambdaRequirements> = {
  // Shared Draft AND Ready lambdas
  getFastqIdsInInstrumentRunId: {
    needsOrcabusApiTools: true,
  },
  validateDraftDataCompleteSchema: {
    needsSsmParametersAccess: true,
    needsSchemaRegistryAccess: true,
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
  // Ready to ICAv2 WES
  bclconvertInteropqcReadyToIcav2WesRequest: {
    needsOrcabusApiTools: true,
  },
  convertS3UriToIcav2Uri: {
    needsIcav2Tools: true,
  },
  // Post Submitted
  convertIcav2WesStateChangeEventToWrscEvent: {
    needsOrcabusApiTools: true,
  },
};

export interface LambdaInput {
  lambdaName: LambdaName;
}

export interface LambdaObject extends LambdaInput {
  lambdaFunction: PythonUvFunction;
}
