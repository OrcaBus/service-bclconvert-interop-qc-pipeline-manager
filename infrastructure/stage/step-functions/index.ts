/** Step Function stuff */
import {
  BuildStepFunctionProps,
  BuildStepFunctionsProps,
  stateMachineNameList,
  StepFunctionObject,
  stepFunctionsRequirementsMap,
  stepFunctionToContainerNamesMap,
  stepFunctionToLambdasMap,
  WireUpPermissionsProps,
} from './interfaces';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import path from 'path';
import {
  EVENT_SOURCE,
  FASTQ_SYNC_DETAIL_TYPE,
  ICAV2_WES_REQUEST_DETAIL_TYPE,
  STEP_FUNCTIONS_DIR,
  WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE,
  WORKFLOW_RUN_UPDATE_DETAIL_TYPE,
} from '../constants';
import { Construct } from 'constructs';
import { camelCaseToSnakeCase, withStackPrefix } from '../utils';
import { ContainerName } from '../ecs/interfaces';

function createStateMachineDefinitionSubstitutions(props: BuildStepFunctionProps): {
  [key: string]: string;
} {
  const definitionSubstitutions: { [key: string]: string } = {};

  const sfnRequirements = stepFunctionsRequirementsMap[props.stateMachineName];
  const lambdaFunctionNamesInSfn = stepFunctionToLambdasMap[props.stateMachineName];
  const ecsContainerNamesInSfn = stepFunctionToContainerNamesMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  const ecsFargateConstructs = props.ecsFargateTaskObjects.filter((fargateObject) =>
    ecsContainerNamesInSfn.includes(<ContainerName>fargateObject.containerDefinition.containerName)
  );

  /* Substitute lambdas in the state machine definition */
  for (const lambdaObject of lambdaFunctions) {
    const sfnSubtitutionKey = `__${camelCaseToSnakeCase(lambdaObject.lambdaName)}_lambda_function_arn__`;
    definitionSubstitutions[sfnSubtitutionKey] =
      lambdaObject.lambdaFunction.currentVersion.functionArn;
  }

  /* Sfn Requirements */
  if (sfnRequirements.needsEventPutPermission) {
    definitionSubstitutions['__event_bus_name__'] = props.eventBus.eventBusName;
    definitionSubstitutions['__workflow_run_state_change_event_detail_type__'] =
      WORKFLOW_RUN_STATE_CHANGE_DETAIL_TYPE;
    definitionSubstitutions['__workflow_run_update_event_detail_type__'] =
      WORKFLOW_RUN_UPDATE_DETAIL_TYPE;
    definitionSubstitutions['__event_source__'] = EVENT_SOURCE;
    definitionSubstitutions['__icav2_wes_request_detail_type__'] = ICAV2_WES_REQUEST_DETAIL_TYPE;
    definitionSubstitutions['__fastq_sync_detail_type__'] = FASTQ_SYNC_DETAIL_TYPE;
    definitionSubstitutions['__new_workflow_manager_is_deployed__'] =
      props.isNewWorkflowManagerDeployed.toString();
  }

  if (sfnRequirements.needsSsmParameterStoreAccess) {
    definitionSubstitutions['__default_project_id_ssm_parameter_name__'] =
      props.ssmParameterPaths.icav2ProjectId;
    definitionSubstitutions['__workflow_name_ssm_parameter_name__'] =
      props.ssmParameterPaths.workflowName;
    definitionSubstitutions['__workflow_version_ssm_parameter_name__'] =
      props.ssmParameterPaths.workflowVersion;
    definitionSubstitutions['__workflow_outputs_prefix_ssm_parameter_name__'] =
      props.ssmParameterPaths.outputPrefix;
    definitionSubstitutions['__workflow_id_to_pipeline_id_ssm_parameter_path_prefix__'] =
      props.ssmParameterPaths.prefixPipelineIdsByWorkflowVersion;
    definitionSubstitutions['__workflow_logs_prefix_ssm_parameter_name__'] =
      props.ssmParameterPaths.logsPrefix;
    definitionSubstitutions['__workflow_cache_prefix_ssm_parameter_name__'] =
      props.ssmParameterPaths.cachePrefix;
    definitionSubstitutions['__get_payload_version_ssm_parameter_name__'] =
      props.ssmParameterPaths.payloadVersion;
  }

  if (sfnRequirements.needsEcsTaskExecutionPermission) {
    /* Add in fargate constructs */
    for (const fargateObject of ecsFargateConstructs) {
      const ecsContainerNameSnakeCase = camelCaseToSnakeCase(
        fargateObject.containerDefinition.containerName
      );
      definitionSubstitutions[`__${ecsContainerNameSnakeCase}_cluster_arn__`] =
        fargateObject.cluster.clusterArn;
      definitionSubstitutions[`__${ecsContainerNameSnakeCase}_task_definition_arn__`] =
        fargateObject.taskDefinition.taskDefinitionArn;
      definitionSubstitutions[`__${ecsContainerNameSnakeCase}_subnets__`] =
        fargateObject.cluster.vpc.privateSubnets.map((subnet) => subnet.subnetId).join(',');
      definitionSubstitutions[`__${ecsContainerNameSnakeCase}_security_group__`] =
        fargateObject.securityGroup.securityGroupId;
      definitionSubstitutions[`__${ecsContainerNameSnakeCase}_container_name__`] =
        fargateObject.containerDefinition.containerName;
    }
  }

  return definitionSubstitutions;
}

function wireUpStateMachinePermissions(scope: Construct, props: WireUpPermissionsProps): void {
  /* Wire up lambda permissions */
  const sfnRequirements = stepFunctionsRequirementsMap[props.stateMachineName];

  const lambdaFunctionNamesInSfn = stepFunctionToLambdasMap[props.stateMachineName];
  const ecsContainerNamesInSfn = stepFunctionToContainerNamesMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  const ecsFargateConstructs = props.ecsFargateTaskObjects.filter((fargateObject) =>
    ecsContainerNamesInSfn.includes(<ContainerName>fargateObject.containerDefinition.containerName)
  );

  /* Allow the state machine to invoke the lambda function */
  for (const lambdaObject of lambdaFunctions) {
    lambdaObject.lambdaFunction.currentVersion.grantInvoke(props.sfnObject);
  }

  if (sfnRequirements.needsEventPutPermission) {
    props.eventBus.grantPutEventsTo(props.sfnObject);
  }

  if (sfnRequirements.needsSsmParameterStoreAccess) {
    // We give access to the full prefix
    // At the cost of needing a nag suppression
    props.sfnObject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${props.ssmParameterPaths.ssmRootPrefix}*`,
        ],
      })
    );

    NagSuppressions.addResourceSuppressions(
      props.sfnObject,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'We need to give access to the full prefix for the SSM parameter store',
        },
      ],
      true
    );
  }

  if (sfnRequirements.needsEcsTaskExecutionPermission) {
    // Grant the state machine access to run the ECS tasks
    for (const ecsFargateConstruct of ecsFargateConstructs) {
      ecsFargateConstruct.taskDefinition.grantRun(props.sfnObject);
    }

    /* Grant the state machine access to monitor the tasks */
    props.sfnObject.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/StepFunctionsGetEventsForECSTaskRule`,
        ],
        actions: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
      })
    );

    /* Will need cdk nag suppressions for this */
    NagSuppressions.addResourceSuppressions(
      props.sfnObject,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to put targets and rules for ECS task monitoring',
        },
      ],
      true
    );
  }

  // SFNs with distributed maps require the following permissions
  if (sfnRequirements.needsDistributedMapPermissions) {
    // SFN requires permissions to execute itself
    // Because this steps execution uses a distributed map in its step function, we
    // have to wire up some extra permissions
    // Grant the state machine's role to execute itself
    // However we cannot just grant permission to the role as this will result in a circular dependency
    // between the state machine and the role
    // Instead we use the workaround here - https://github.com/aws/aws-cdk/issues/28820#issuecomment-1936010520
    const distributedMapPolicy = new iam.Policy(
      scope,
      `${props.stateMachineName}-distributed-map-policy`,
      {
        document: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: [props.sfnObject.stateMachineArn],
              actions: ['states:StartExecution'],
            }),
            new iam.PolicyStatement({
              resources: [
                `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:execution:${props.sfnObject.stateMachineName}/*:*`,
              ],
              actions: ['states:RedriveExecution'],
            }),
          ],
        }),
      }
    );
    // Add the policy to the state machine's role
    props.sfnObject.role.attachInlinePolicy(distributedMapPolicy);
    // Oh and well also need to put in NagSuppressions because we just used a LOT of stars
    NagSuppressions.addResourceSuppressions(
      [distributedMapPolicy, props.sfnObject],
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'We need to allow the state machine to execute itself and redrive executions',
        },
      ]
    );
  }
}

function buildStepFunction(scope: Construct, props: BuildStepFunctionProps): StepFunctionObject {
  const sfnNameToSnakeCase = camelCaseToSnakeCase(props.stateMachineName);

  /* Create the state machine definition substitutions */
  const stateMachine = new sfn.StateMachine(scope, props.stateMachineName, {
    stateMachineName: withStackPrefix(props.stateMachineName),
    definitionBody: sfn.DefinitionBody.fromFile(
      path.join(STEP_FUNCTIONS_DIR, sfnNameToSnakeCase + `_sfn_template.asl.json`)
    ),
    definitionSubstitutions: createStateMachineDefinitionSubstitutions(props),
  });

  /* Grant the state machine permissions */
  wireUpStateMachinePermissions(scope, {
    sfnObject: stateMachine,
    ...props,
  });

  /* Nag Suppressions */
  /* AwsSolutions-SF1 - We don't need ALL events to be logged */
  /* AwsSolutions-SF2 - We also don't need X-Ray tracing */
  NagSuppressions.addResourceSuppressions(
    stateMachine,
    [
      {
        id: 'AwsSolutions-SF1',
        reason: 'We do not need all events to be logged',
      },
      {
        id: 'AwsSolutions-SF2',
        reason: 'We do not need X-Ray tracing',
      },
    ],
    true
  );

  /* Return as a state machine object property */
  return {
    ...props,
    sfnObject: stateMachine,
  };
}

export function buildAllStepFunctions(
  scope: Construct,
  props: BuildStepFunctionsProps
): StepFunctionObject[] {
  const stepFunctionObjects: StepFunctionObject[] = [];

  for (const stepFunctionName of stateMachineNameList) {
    stepFunctionObjects.push(
      buildStepFunction(scope, {
        stateMachineName: stepFunctionName,
        ...props,
      })
    );
  }

  return stepFunctionObjects;
}
