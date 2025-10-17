import { EventPattern, IEventBus, Rule } from 'aws-cdk-lib/aws-events';

/**
 * EventBridge Rules Interfaces
 */
export type EventBridgeRuleName =
  // Draft Events
  | 'wrscDraftLegacy'
  | 'wrscDraft'
  // Pre-ready
  | 'wrscReadyLegacy'
  | 'wrscReady'
  // Post submitted
  | 'Icav2WascEvent';

export const eventBridgeRuleNameList: EventBridgeRuleName[] = [
  // Draft Events
  'wrscDraftLegacy',
  'wrscDraft',
  // Pre-ready
  'wrscReadyLegacy',
  'wrscReady',
  // Post submitted
  'Icav2WascEvent',
];

export interface EventBridgeRuleProps {
  ruleName: EventBridgeRuleName;
  eventBus: IEventBus;
  eventPattern: EventPattern;
}

export interface EventBridgeRulesProps {
  eventBus: IEventBus;
}

export interface EventBridgeRuleObject {
  ruleName: EventBridgeRuleName;
  ruleObject: Rule;
}

export type BuildDraftRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
export type BuildReadyRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
export type BuildIascRuleProps = Omit<EventBridgeRuleProps, 'eventPattern'>;
