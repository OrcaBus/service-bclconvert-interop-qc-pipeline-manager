import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { buildAllLambdas } from './lambda';
import { buildAllStepFunctions } from './step-functions';
import { StatelessApplicationStackConfig } from './interfaces';
import { buildAllEventRules } from './event-rules';
import { buildAllEventBridgeTargets } from './event-targets';
import { NagSuppressions } from 'cdk-nag';
import {
  DEFAULT_HOSTNAME_SSM_PARAMETER,
  DEFAULT_ORCABUS_TOKEN_SECRET_ID,
} from '@orcabus/platform-cdk-constructs/lambda/config';
import { buildFargateTasks } from './ecs';

export type StatelessApplicationStackProps = cdk.StackProps & StatelessApplicationStackConfig;

export class StatelessApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessApplicationStackProps) {
    super(scope, id, props);

    /**
     * BCLConvert InterOp QC Stack
     * Deploys the BCLConvert InterOp QC orchestration services
     */
    // Get the event bus as a construct
    const orcabusMainEventBus = events.EventBus.fromEventBusName(
      this,
      props.eventBusName,
      props.eventBusName
    );

    // Get the hostname ssm parameter object
    const hostnameSsmParameter = ssm.StringParameter.fromStringParameterName(
      this,
      'HostnameSsmParameter',
      DEFAULT_HOSTNAME_SSM_PARAMETER
    );

    const orcabusTokenSecret = secretsManager.Secret.fromSecretNameV2(
      this,
      'OrcabusTokenSecret',
      DEFAULT_ORCABUS_TOKEN_SECRET_ID
    );

    const icav2AccessTokenSecret = secretsManager.Secret.fromSecretNameV2(
      this,
      'IcaV2AccessTokenSecret',
      props.icav2AccessTokenSecretId
    );

    // Build the lambdas
    const lambdas = buildAllLambdas(this);

    // Build the ecs fargate task
    const ecsFargateTasks = buildFargateTasks(this, {
      hostnameSsmParameter: hostnameSsmParameter,
      orcabusTokenSecretObj: orcabusTokenSecret,
      icav2AccessTokenSecretObj: icav2AccessTokenSecret,
    });

    // Build the state machines
    const stateMachines = buildAllStepFunctions(this, {
      lambdaObjects: lambdas,
      eventBus: orcabusMainEventBus,
      ssmParameterPaths: props.ssmParameterPaths,
      isNewWorkflowManagerDeployed: props.isNewWorkflowManagerDeployed,
      ecsFargateTaskObjects: ecsFargateTasks,
    });

    // Add event rules
    const eventRules = buildAllEventRules(this, {
      eventBus: orcabusMainEventBus,
    });

    // Add event targets
    buildAllEventBridgeTargets(this, {
      eventBridgeRuleObjects: eventRules,
      stepFunctionObjects: stateMachines,
    });

    // Add in stack suppressions
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'We use the standard AWS Lambda execution role, which is not specific to this stack.',
      },
    ]);
  }
}
