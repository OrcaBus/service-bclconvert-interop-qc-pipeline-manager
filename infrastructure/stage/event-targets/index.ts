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

export function buildBclconvertInteropQcReadyLegacyToIcav2WesSubmittedSfnTarget(
  props: AddSfnAsEventBridgeTargetProps
) {
  // We take in the event detail from the bssh fastq copy succeeded event
  // And return only the instrument run id and the output prefix and linkedLibraries
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: RuleTargetInput.fromObject({
        portalRunId: EventField.fromPath('$.detail.portalRunId'),
        timestamp: EventField.fromPath('$.detail.timestamp'),
        status: EventField.fromPath('$.detail.status'),
        workflow: {
          name: EventField.fromPath('$.detail.workflowName'),
          version: EventField.fromPath('$.detail.workflowVersion'),
        },
        workflowRunName: EventField.fromPath('$.detail.workflowRunName'),
        libraries: EventField.fromPath('$.detail.libraries'),
        payload: EventField.fromPath('$.detail.payload'),
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
            (eventBridgeObject) => eventBridgeObject.ruleName === 'bsshToAwsS3CopySucceededEvent'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'bsshFastqToAwsWrscToReadyWrsc'
          )?.sfnObject,
        });
        break;
      }
      case 'bclconvertInteropQcReadyLegacyToIcav2WesSubmittedSfnTarget': {
        buildBclconvertInteropQcReadyLegacyToIcav2WesSubmittedSfnTarget(<
          AddSfnAsEventBridgeTargetProps
        >{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'ReadyEventLegacy'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'readyToIcav2WesSubmitEvent'
          )?.sfnObject,
        });
        break;
      }
      case 'bclconvertInteropQcReadyToIcav2WesSubmittedSfnTarget': {
        buildBclconvertInteropQcReadyToIcav2WesSubmittedSfnTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'ReadyEvent'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'readyToIcav2WesSubmitEvent'
          )?.sfnObject,
        });
        break;
      }
      case 'icav2WesAnalysisStateChangeEventToWrscSfnTarget': {
        buildIcav2WesEventStateChangeToWrscSfnTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'Icav2WascEvent'
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
