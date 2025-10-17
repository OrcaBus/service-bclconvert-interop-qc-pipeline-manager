/*
Build the ecs fargate task
*/

import { Construct } from 'constructs';
import {
  CPU_ARCHITECTURE_MAP,
  EcsFargateTaskConstruct,
  FargateEcsTaskConstructProps,
} from '@orcabus/platform-cdk-constructs/ecs';
import * as path from 'path';
import { ECS_DIR } from '../constants';
import { BuildFargateTaskEcsProps, BuildFargateTasksEcsProps, containerNames } from './interfaces';
import { NagSuppressions } from 'cdk-nag';
import { ICAV2_BASE_URL } from '@orcabus/platform-cdk-constructs/shared-config/icav2';
import { camelCaseToSnakeCase } from '../utils';

function buildEcsFargateTask(scope: Construct, id: string, props: FargateEcsTaskConstructProps) {
  /*
    Generate an ECS Fargate task construct with the provided properties.
    */
  return new EcsFargateTaskConstruct(scope, id, props);
}

function buildFargateTask(
  scope: Construct,
  props: BuildFargateTaskEcsProps
): EcsFargateTaskConstruct {
  /*
    Build the Rename sample multiqc parquet file
  */

  const ecsTask = buildEcsFargateTask(scope, props.containerName, {
    containerName: props.containerName,
    dockerPath: path.join(ECS_DIR, camelCaseToSnakeCase(props.containerName)),
    nCpus: 2, // 2 CPUs
    memoryLimitGiB: 4, // 4 GB of memory (minimum allowed for 2 CPUs)
    architecture: 'ARM64',
    runtimePlatform: CPU_ARCHITECTURE_MAP['ARM64'],
  });

  // Give access to the ssm parameter
  props.hostnameSsmParameter.grantRead(ecsTask.taskDefinition.taskRole);

  // Needs access to the secrets manager
  props.orcabusTokenSecretObj.grantRead(ecsTask.taskDefinition.taskRole);
  props.icav2AccessTokenSecretObj.grantRead(ecsTask.taskDefinition.taskRole);

  // Set the environment variables
  ecsTask.containerDefinition.addEnvironment(
    'HOSTNAME_SSM_PARAMETER_NAME',
    props.hostnameSsmParameter.parameterName
  );
  ecsTask.containerDefinition.addEnvironment(
    'ORCABUS_TOKEN_SECRET_ID',
    props.orcabusTokenSecretObj.secretName
  );
  ecsTask.containerDefinition.addEnvironment(
    'ICAV2_ACCESS_TOKEN_SECRET_ID',
    props.icav2AccessTokenSecretObj.secretName
  );
  ecsTask.containerDefinition.addEnvironment('ICAV2_BASE_URL', ICAV2_BASE_URL);

  // Add suppressions for the task role
  // Since the task role needs to access the S3 bucket prefix
  NagSuppressions.addResourceSuppressions(
    [ecsTask.taskDefinition, ecsTask.taskExecutionRole],
    [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The task role needs to access secrets manager.',
      },
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'We use the standard ecs task role for this task, which allows the guard duty agent to run alongside the task.',
      },
      {
        id: 'AwsSolutions-ECS2',
        reason:
          'The task is designed to run with some constant environment variables, not sure why this is a bad thing?',
      },
    ],
    true
  );

  return ecsTask;
}

export function buildFargateTasks(scope: Construct, props: BuildFargateTasksEcsProps) {
  const fargateTasks: EcsFargateTaskConstruct[] = [];
  for (const containerName of containerNames) {
    fargateTasks.push(
      buildFargateTask(scope, {
        containerName: containerName,
        ...props,
      })
    );
  }
  return fargateTasks;
}
