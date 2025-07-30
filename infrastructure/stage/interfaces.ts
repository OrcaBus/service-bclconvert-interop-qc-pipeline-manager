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

  // Is the new workflow manager deployed
  isNewWorkflowManagerDeployed: boolean;
}
