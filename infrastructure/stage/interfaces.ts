/*

Interfaces for the application

 */

import { SsmParameterPaths, SsmParameterValues } from './ssm/interfaces';

/**
 * Stateful application stack interface.
 */

export interface StatefulApplicationStackConfig {
  // Values
  ssmParameterValues: SsmParameterValues;

  // Keys
  ssmParameterPaths: SsmParameterPaths;
}

/**
 * Stateless application stack interface.
 */
export interface StatelessApplicationStackConfig {
  // SSM Parameter Keys
  ssmParameterPaths: SsmParameterPaths;

  // We need the workflow name though for the event rules
  workflowName: string;

  // Event Stuff
  eventBusName: string;
  eventSource: string;
  workflowRunStateChangeDetailType: string;
  icav2WesRequestDetailType: string;
  icav2WesStateChangeDetailType: string;

  // Secret stuff
  icav2AccessTokenSecretId: string;
}

export type PayloadVersionType = '2025.05.29' | '2026.04.01';
export type WorkflowVersionType = '1.3.1--1.25.2' | '1.5.0--1.31' | '1.9.0--1.33';

export const payloadVersionList: PayloadVersionType[] = ['2025.05.29', '2026.04.01'];
