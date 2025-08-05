/* Event Bridge Rules */
import {
  BuildBclconvertInteropQcReadyRuleProps,
  BuildBsshFastqCopySucceededRuleProps,
  BuildIcav2AnalysisStateChangeRuleProps,
  eventBridgeRuleNameList,
  EventBridgeRuleObject,
  EventBridgeRuleProps,
  EventBridgeRulesProps,
} from './interfaces';
import { EventPattern, Rule } from 'aws-cdk-lib/aws-events';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import {
  BSSH_FASTQ_COPY_TO_AWS_WORKFLOW_RUN_NAME,
  ICAV2_WES_EVENT_SOURCE,
  ICAV2_WES_STATE_CHANGE_DETAIL_TYPE,
  READY_STATUS,
  SUCCEEDED_STATUS,
  WORKFLOW_MANAGER_EVENT_SOURCE,
  WORKFLOW_NAME,
  WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE,
} from '../constants';
import { withStackPrefix } from '../utils';

/*
https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
*/

function buildIcav2AnalysisStateChangeEventPattern(): EventPattern {
  return {
    detailType: [ICAV2_WES_STATE_CHANGE_DETAIL_TYPE],
    source: [ICAV2_WES_EVENT_SOURCE],
    detail: {
      name: [
        {
          wildcard: `*--${WORKFLOW_NAME}--*`,
        },
      ],
    },
  };
}

function buildWorkflowManagerReadyEventPatternLegacy(): EventPattern {
  return {
    detailType: [WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE],
    source: [WORKFLOW_MANAGER_EVENT_SOURCE],
    detail: {
      workflowName: [WORKFLOW_NAME],
      status: [READY_STATUS],
    },
  };
}

function buildWorkflowManagerReadyEventPattern(): EventPattern {
  return {
    detailType: [WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE],
    source: [WORKFLOW_MANAGER_EVENT_SOURCE],
    detail: {
      workflow: {
        name: [WORKFLOW_NAME],
      },
      status: [READY_STATUS],
    },
  };
}

function buildBsshFastqCopyToAwsSucceededEventPatternLegacy(): EventPattern {
  return {
    detailType: [WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE],
    source: [WORKFLOW_MANAGER_EVENT_SOURCE],
    detail: {
      workflowName: [BSSH_FASTQ_COPY_TO_AWS_WORKFLOW_RUN_NAME],
      status: [SUCCEEDED_STATUS],
    },
  };
}

function buildBsshFastqCopyToAwsSucceededEventPattern(): EventPattern {
  return {
    detailType: [WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE],
    source: [WORKFLOW_MANAGER_EVENT_SOURCE],
    detail: {
      workflow: {
        name: [BSSH_FASTQ_COPY_TO_AWS_WORKFLOW_RUN_NAME],
      },
      status: [SUCCEEDED_STATUS],
    },
  };
}

function buildEventRule(scope: Construct, props: EventBridgeRuleProps): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: withStackPrefix(props.ruleName),
    eventPattern: props.eventPattern,
    eventBus: props.eventBus,
  });
}

function buildWorkflowRunStateChangeBsshFastqCopySucceededEventRuleLegacy(
  scope: Construct,
  props: BuildBsshFastqCopySucceededRuleProps
): Rule {
  return buildEventRule(scope, {
    ruleName: props.ruleName,
    eventPattern: buildBsshFastqCopyToAwsSucceededEventPatternLegacy(),
    eventBus: props.eventBus,
  });
}

function buildWorkflowRunStateChangeBsshFastqCopySucceededEventRule(
  scope: Construct,
  props: BuildBsshFastqCopySucceededRuleProps
): Rule {
  return buildEventRule(scope, {
    ruleName: props.ruleName,
    eventPattern: buildBsshFastqCopyToAwsSucceededEventPattern(),
    eventBus: props.eventBus,
  });
}

function buildWorkflowRunStateChangeBclconvertInteropQcReadyEventRuleLegacy(
  scope: Construct,
  props: BuildBclconvertInteropQcReadyRuleProps
): Rule {
  return buildEventRule(scope, {
    ruleName: props.ruleName,
    eventPattern: buildWorkflowManagerReadyEventPatternLegacy(),
    eventBus: props.eventBus,
  });
}

function buildWorkflowRunStateChangeBclconvertInteropQcReadyEventRule(
  scope: Construct,
  props: BuildBclconvertInteropQcReadyRuleProps
): Rule {
  return buildEventRule(scope, {
    ruleName: props.ruleName,
    eventPattern: buildWorkflowManagerReadyEventPattern(),
    eventBus: props.eventBus,
  });
}

function buildIcav2WesAnalysisStateChangeRule(
  scope: Construct,
  props: BuildIcav2AnalysisStateChangeRuleProps
): Rule {
  return buildEventRule(scope, {
    ruleName: props.ruleName,
    eventPattern: buildIcav2AnalysisStateChangeEventPattern(),
    eventBus: props.eventBus,
  });
}

export function buildAllEventRules(
  scope: Construct,
  props: EventBridgeRulesProps
): EventBridgeRuleObject[] {
  const eventBridgeRuleObjects: EventBridgeRuleObject[] = [];

  // Iterate over the eventBridgeNameList and create the event rules
  for (const ruleName of eventBridgeRuleNameList) {
    switch (ruleName) {
      case 'bsshToAwsS3CopySucceededEventLegacy': {
        eventBridgeRuleObjects.push({
          ruleName: ruleName,
          ruleObject: buildWorkflowRunStateChangeBsshFastqCopySucceededEventRuleLegacy(scope, {
            ruleName: ruleName,
            eventBus: props.eventBus,
          }),
        });
        break;
      }
      case 'bsshToAwsS3CopySucceededEvent': {
        eventBridgeRuleObjects.push({
          ruleName: ruleName,
          ruleObject: buildWorkflowRunStateChangeBsshFastqCopySucceededEventRule(scope, {
            ruleName: ruleName,
            eventBus: props.eventBus,
          }),
        });
        break;
      }
      case 'ReadyEventLegacy': {
        eventBridgeRuleObjects.push({
          ruleName: ruleName,
          ruleObject: buildWorkflowRunStateChangeBclconvertInteropQcReadyEventRuleLegacy(scope, {
            ruleName: ruleName,
            eventBus: props.eventBus,
          }),
        });
        break;
      }
      case 'ReadyEvent': {
        eventBridgeRuleObjects.push({
          ruleName: ruleName,
          ruleObject: buildWorkflowRunStateChangeBclconvertInteropQcReadyEventRule(scope, {
            ruleName: ruleName,
            eventBus: props.eventBus,
          }),
        });
        break;
      }
      case 'Icav2WascEvent': {
        eventBridgeRuleObjects.push({
          ruleName: ruleName,
          ruleObject: buildIcav2WesAnalysisStateChangeRule(scope, {
            ruleName: ruleName,
            eventBus: props.eventBus,
          }),
        });
      }
    }
  }

  // Return the event bridge rule objects
  return eventBridgeRuleObjects;
}
