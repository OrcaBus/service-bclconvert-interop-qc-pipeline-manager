import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StatefulApplicationStackConfig } from './interfaces';
import { buildSsmParameters } from './ssm';
import { buildSchemas } from './event-schemas';
import { GitStack } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

export type StatefulApplicationStackProps = StatefulApplicationStackConfig & cdk.StackProps;

export class StatefulApplicationStack extends GitStack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    /**
     * Define your stack to be deployed in stages here
     */
    buildSsmParameters(this, {
      ssmParameterValues: props.ssmParameterValues,
      ssmParameterPaths: props.ssmParameterPaths,
    });

    /**
     * Build the schemas
     */
    buildSchemas(this);
  }
}
