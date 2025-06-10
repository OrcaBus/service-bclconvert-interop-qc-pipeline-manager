import {
  AddSfnAsEventBridgeTargetProps,
  eventBridgeTargetsNameList,
  EventBridgeTargetsProps,
} from './interfaces';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

export function buildBsshFastqCopySucceededToBclconvertInteropQcReadySfnTarget(
  props: AddSfnAsEventBridgeTargetProps
) {
  // We take in the event detail from the bssh fastq copy succeeded event
  // And return only the instrument run id and the output prefix and linkedLibraries
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: RuleTargetInput.fromObject({
        instrumentRunId: EventField.fromPath('$.detail.payload.data.outputs.instrumentRunId'),
        primaryDataOutputUri: EventField.fromPath('$.detail.payload.data.outputs.outputUri'),
        linkedLibraries: EventField.fromPath('$.detail.linkedLibraries'),
      }),
    })
  );
}

export function buildBclconvertInteropQcReadyToIcav2WesSubmittedSfnTarget(
  props: AddSfnAsEventBridgeTargetProps
) {
  // We take in the event detail from the bssh fastq copy succeeded event
  // And return only the instrument run id and the output prefix and linkedLibraries
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromEventPath('$.detail'),
    })
  );
}

export function buildIcav2WesEventStateChangeToWrscSfnTarget(
  props: AddSfnAsEventBridgeTargetProps
) {
  // We take in the event detail from the icav2 wes state change event
  // And return only the instrument run id and the output prefix and linkedLibraries
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromEventPath('$.detail'),
    })
  );
}

export function buildAllEventBridgeTargets(scope: Construct, props: EventBridgeTargetsProps) {
  for (const eventBridgeTargetsName of eventBridgeTargetsNameList) {
    switch (eventBridgeTargetsName) {
      case 'bsshFastqCopySucceededToBclconvertInteropQcReadySfnTarget': {
        buildBsshFastqCopySucceededToBclconvertInteropQcReadySfnTarget(<
          AddSfnAsEventBridgeTargetProps
        >{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'bsshFastqCopySucceded'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'bsshSucceededToBclconvertInteropQcReadyWrsc'
          )?.sfnObject,
        });
        break;
      }
      case 'bclconvertInteropQcReadyToIcav2WesSubmittedSfnTarget': {
        buildBclconvertInteropQcReadyToIcav2WesSubmittedSfnTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'bclconvertInteropQcReady'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'bclconvertInteropqcReadyToIcav2WesSubmitted'
          )?.sfnObject,
        });
        break;
      }
      case 'icav2WesAnalysisStateChangeEventToWrscSfnTarget': {
        buildIcav2WesEventStateChangeToWrscSfnTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'bclconvertInteropQcIcav2WesAnalysisStateChange'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'icav2WesEventToWrscEvent'
          )?.sfnObject,
        });
        break;
      }
    }
  }
}
