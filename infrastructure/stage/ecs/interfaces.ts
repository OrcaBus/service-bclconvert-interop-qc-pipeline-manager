/*
Interfaces
*/

import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IParameter } from 'aws-cdk-lib/aws-ssm';

export type ContainerName = 'resampleMultiqcParquetFile';

export const containerNames: ContainerName[] = ['resampleMultiqcParquetFile'];

export interface BuildFargateTasksEcsProps {
  hostnameSsmParameter: IParameter;
  orcabusTokenSecretObj: ISecret;
  icav2AccessTokenSecretObj: ISecret;
}

export interface BuildFargateTaskEcsProps extends BuildFargateTasksEcsProps {
  containerName: ContainerName;
}
