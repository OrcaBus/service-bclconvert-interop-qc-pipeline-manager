import { IEventBus } from 'aws-cdk-lib/aws-events';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaName, LambdaObject } from '../lambda/interfaces';
import { SsmParameterPaths } from '../ssm/interfaces';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';
import { ContainerName } from '../ecs/interfaces';

/**
 * Step Function Interfaces
 */
export type StateMachineName =
  // Populate Draft Data Events
  | 'populateDraftData'
  // Validate Draft Data
  | 'validateDraftToReady'
  // Ready to ICAv2 WES
  | 'readyToIcav2WesSubmitEvent'
  // BSSH Fastq to WRSC event
  | 'icav2WesEventToWrscEvent';

export const stateMachineNameList: StateMachineName[] = [
  // Populate Draft Data Events
  'populateDraftData',
  // Validate Draft Data
  'validateDraftToReady',
  // Ready to ICAv2 WES
  'readyToIcav2WesSubmitEvent',
  // BSSH Fastq to WRSC event
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
  isNewWorkflowManagerDeployed: boolean;
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
  // Validate Draft Data
  validateDraftToReady: {
    needsEventPutPermission: true,
  },
  // Ready to ICAv2 WES
  readyToIcav2WesSubmitEvent: {
    needsEventPutPermission: true,
    needsEcsTaskExecutionPermission: true,
    needsDistributedMapPermissions: true,
  },
  // ICAv2 WES to WRSC event
  icav2WesEventToWrscEvent: {
    needsEventPutPermission: true,
  },
};

export const stepFunctionToLambdasMap: Record<StateMachineName, LambdaName[]> = {
  // Populate Draft Data Events
  populateDraftData: [
    'getFastqIdsInInstrumentRunId',
    'getBsshFastqOutputs',
    'getMultiqcParquetOutputsFromFastqIdList',
    'validateDraftDataCompleteSchema',
    'generateBclconvertInteropqcDraftDataEvent',
  ],
  // Validate Draft Data
  validateDraftToReady: ['validateDraftDataCompleteSchema'],
  // Ready to ICAv2 WES
  readyToIcav2WesSubmitEvent: [
    'bclconvertInteropqcReadyToIcav2WesRequest',
    'convertS3UriToIcav2Uri',
  ],
  // ICAv2 WES to WRSC event
  icav2WesEventToWrscEvent: ['convertIcav2WesStateChangeEventToWrscEvent'],
};

export const stepFunctionToContainerNamesMap: Record<StateMachineName, ContainerName[]> = {
  // Populate Draft Data Events
  populateDraftData: [],
  // Validate Draft Data
  validateDraftToReady: [],
  // Ready to ICAv2 WES
  readyToIcav2WesSubmitEvent: ['resampleMultiqcParquetFile'],
  // ICAv2 WES to WRSC event
  icav2WesEventToWrscEvent: [],
};
