import { EventPattern, IEventBus, Rule } from 'aws-cdk-lib/aws-events';

/**
 * EventBridge Rules Interfaces
 */
export type EventBridgeRuleNameList =
  | 'bsshToAwsS3CopySucceededEvent'
  | 'ReadyEventLegacy'
  | 'ReadyEvent'
  | 'Icav2WascEvent';

export const eventBridgeRuleNameList: EventBridgeRuleNameList[] = [
  'bsshToAwsS3CopySucceededEvent',
  'ReadyEventLegacy',
  'ReadyEvent',
  'Icav2WascEvent',
];

export interface EventBridgeRuleProps {
  ruleName: EventBridgeRuleNameList;
  eventBus: IEventBus;
  eventPattern: EventPattern;
}

export interface EventBridgeRulesProps {
  eventBus: IEventBus;
}

export interface EventBridgeRuleObject {
  ruleName: EventBridgeRuleNameList;
  ruleObject: Rule;
}

export type BuildIcav2AnalysisStateChangeRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
export type BuildBsshFastqCopySucceededRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
export type BuildBclconvertInteropQcReadyRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
