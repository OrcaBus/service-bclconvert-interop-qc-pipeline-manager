import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { EventBridgeRuleObject } from '../event-rules/interfaces';
import { StepFunctionObject } from '../step-functions/interfaces';

/**
 * EventBridge Target Interfaces
 */
export type EventBridgeTargetName =
  // Populate draft data event targets
  | 'draftLegacyToPopulateDraftDataSfnTarget'
  | 'draftToPopulateDraftDataSfnTarget'
  // Validate draft to ready
  | 'draftLegacyToValidateDraftSfnTarget'
  | 'draftToValidateDraftSfnTarget'
  // Ready to InterOp QC
  | 'readyToIcav2WesSubmiitedSfnTarget'
  | 'readyToIcav2WesSubmiitedLegacySfnTarget'
  // Post submitted
  | 'icav2WesAnalysisStateChangeEventToWrscSfnTarget';

export const eventBridgeTargetsNameList: EventBridgeTargetName[] = [
  // Populate draft data event targets
  'draftLegacyToPopulateDraftDataSfnTarget',
  'draftToPopulateDraftDataSfnTarget',
  // Validate draft to ready
  'draftLegacyToValidateDraftSfnTarget',
  'draftToValidateDraftSfnTarget',
  // Ready to InterOp QC
  'readyToIcav2WesSubmiitedSfnTarget',
  'readyToIcav2WesSubmiitedLegacySfnTarget',
  // Post submitted
  'icav2WesAnalysisStateChangeEventToWrscSfnTarget',
];

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
}

export interface EventBridgeTargetsProps {
  eventBridgeRuleObjects: EventBridgeRuleObject[];
  stepFunctionObjects: StepFunctionObject[];
}
