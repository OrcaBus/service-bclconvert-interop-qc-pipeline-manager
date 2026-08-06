import { IEventBus } from 'aws-cdk-lib/aws-events';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaNameList, LambdaObject } from '../lambda/interfaces';
import { SsmParameterPaths } from '../ssm/interfaces';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';
import { ContainerName } from '../ecs/interfaces';

/**
 * Step Function Interfaces
 */
export type StateMachineName =
  // Populate Draft Data Events
  | 'populateDraftData'
  // Validate Draft Data and Put Ready Event
  | 'validateDraftDataAndPutReadyEvent'
  // Ready Event to ICAv2 WES Request Event
  | 'readyEventToIcav2WesRequestEvent'
  // ICAv2 WES Event to WRSC Event
  | 'icav2WesEventToWrscEvent';

export const stateMachineNameList: StateMachineName[] = [
  // Populate Draft Data Events
  'populateDraftData',
  // Validate Draft Data and Put Ready Event
  'validateDraftDataAndPutReadyEvent',
  // Ready Event to ICAv2 WES Request Event
  'readyEventToIcav2WesRequestEvent',
  // ICAv2 WES Event to WRSC Event
  'icav2WesEventToWrscEvent',
];

// Requirements interface for Step Functions
export interface StepFunctionRequirements {
  // Event stuff
  needsEventPutPermission?: boolean;

  // SSM Stuff
  needsSsmParameterStoreAccess?: boolean;

  // Needs ECS stuff
  needsEcsTaskExecutionPermission?: boolean;

  // Needs Distributed Map stuff
  needsDistributedMapPermissions?: boolean;
}

export interface StepFunctionInput {
  stateMachineName: StateMachineName;
}

export interface BuildStepFunctionProps extends StepFunctionInput {
  lambdaObjects: LambdaObject[];
  eventBus: IEventBus;
  ssmParameterPaths: SsmParameterPaths;
  ecsFargateTaskObjects: EcsFargateTaskConstruct[];
}

export interface StepFunctionObject extends StepFunctionInput {
  sfnObject: StateMachine;
}

export type WireUpPermissionsProps = BuildStepFunctionProps & StepFunctionObject;

export type BuildStepFunctionsProps = Omit<BuildStepFunctionProps, 'stateMachineName'>;

export const stepFunctionsRequirementsMap: Record<StateMachineName, StepFunctionRequirements> = {
  // Populate Draft Data Events
  populateDraftData: {
    needsEventPutPermission: true,
    needsSsmParameterStoreAccess: true,
    needsDistributedMapPermissions: true,
  },
  // Validate Draft Data and Put Ready Event
  validateDraftDataAndPutReadyEvent: {
    needsEventPutPermission: true,
  },
  // Ready Event to ICAv2 WES Request Event
  readyEventToIcav2WesRequestEvent: {
    needsEventPutPermission: true,
    needsEcsTaskExecutionPermission: true,
    needsDistributedMapPermissions: true,
  },
  // ICAv2 WES Event to WRSC Event
  icav2WesEventToWrscEvent: {
    needsEventPutPermission: true,
  },
};

export const stepFunctionToLambdasMap: Record<StateMachineName, LambdaNameList[]> = {
  // Populate Draft Data Events
  populateDraftData: [
    'getFastqIdsInInstrumentRunId',
    'getBsshFastqOutputs',
    'getMultiqcParquetOutputsFromFastqIdList',
    'validateDraftDataCompleteSchema',
    'generateBclconvertInteropqcDraftDataEvent',
    'addSampleFilters',
    'addPopulateDraftComment',
    'comparePayload',
    'generateWruEventObjectWithMergedData',
    'getMissingSchemaFields',
  ],
  // Validate Draft Data and Put Ready Event
  validateDraftDataAndPutReadyEvent: ['validateDraftDataCompleteSchema', 'postSchemaValidation'],
  // Ready Event to ICAv2 WES Request Event
  readyEventToIcav2WesRequestEvent: [
    'addReadyComment',
    'bclconvertInteropqcReadyToIcav2WesRequest',
    'convertS3UriToIcav2Uri',
    'writeSampleFiltersFile',
  ],
  // ICAv2 WES Event to WRSC Event
  icav2WesEventToWrscEvent: ['convertIcav2WesStateChangeEventToWrscEvent', 'addWesFailureComment'],
};

export const stepFunctionToContainerNamesMap: Record<StateMachineName, ContainerName[]> = {
  // Populate Draft Data Events
  populateDraftData: [],
  // Validate Draft Data and Put Ready Event
  validateDraftDataAndPutReadyEvent: [],
  // Ready Event to ICAv2 WES Request Event
  readyEventToIcav2WesRequestEvent: ['resampleMultiqcParquetFile'],
  // ICAv2 WES Event to WRSC Event
  icav2WesEventToWrscEvent: [],
};
