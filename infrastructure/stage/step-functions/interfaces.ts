import { IEventBus } from 'aws-cdk-lib/aws-events';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaNameList, LambdaObject } from '../lambda/interfaces';
import { SsmParameterPaths } from '../ssm/interfaces';

/**
 * Step Function Interfaces
 */
export type StateMachineNameList =
  | 'readyToIcav2WesSubmitEvent'
  | 'bsshFastqToAwsWrscToReadyWrsc'
  | 'icav2WesEventToWrscEvent';

export const stateMachineNameList: StateMachineNameList[] = [
  'readyToIcav2WesSubmitEvent',
  'bsshFastqToAwsWrscToReadyWrsc',
  'icav2WesEventToWrscEvent',
];

// Requirements interface for Step Functions
export interface StepFunctionRequirements {
  // Event stuff
  needsEventPutPermission?: boolean;

  // SSM Stuff
  needsSsmParameterStoreAccess?: boolean;
}

export interface StepFunctionInput {
  stateMachineName: StateMachineNameList;
}

export interface BuildStepFunctionProps extends StepFunctionInput {
  lambdaObjects: LambdaObject[];
  eventBus: IEventBus;
  ssmParameterPaths: SsmParameterPaths;
  isNewWorkflowManagerDeployed: boolean;
}

export interface StepFunctionObject extends StepFunctionInput {
  sfnObject: StateMachine;
}

export type WireUpPermissionsProps = BuildStepFunctionProps & StepFunctionObject;

export type BuildStepFunctionsProps = Omit<BuildStepFunctionProps, 'stateMachineName'>;

export const stepFunctionsRequirementsMap: Record<StateMachineNameList, StepFunctionRequirements> =
  {
    readyToIcav2WesSubmitEvent: {
      needsEventPutPermission: true,
      needsSsmParameterStoreAccess: true,
    },
    bsshFastqToAwsWrscToReadyWrsc: {
      needsEventPutPermission: true,
      needsSsmParameterStoreAccess: true,
    },
    icav2WesEventToWrscEvent: {
      needsEventPutPermission: true,
    },
  };

export const stepFunctionToLambdasMap: Record<StateMachineNameList, LambdaNameList[]> = {
  readyToIcav2WesSubmitEvent: ['bclconvertInteropqcReadyToIcav2WesRequest'],
  bsshFastqToAwsWrscToReadyWrsc: [
    'generateWorkflowRunNameAndPortalRunId',
    'bsshFastqCopySucceededToBclconvertInteropQcReady',
  ],
  icav2WesEventToWrscEvent: ['convertIcav2WesStateChangeEventToWrscEvent'],
};
