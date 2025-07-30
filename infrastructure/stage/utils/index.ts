import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import {
  PIPELINE_CACHE_BUCKET,
  PIPELINE_CACHE_PREFIX,
} from '@orcabus/platform-cdk-constructs/shared-config/s3';
import { STACK_PREFIX } from '../constants';

export function camelCaseToSnakeCase(camelCase: string): string {
  return camelCase.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function substituteBucketConstants(uri: string, stage: StageName) {
  return uri
    .replace(/{__CACHE_BUCKET__}/g, PIPELINE_CACHE_BUCKET[stage])
    .replace(/{__CACHE_PREFIX__}/g, PIPELINE_CACHE_PREFIX[stage]);
}

export function withStackPrefix(attributeName: string): string {
  // This is used to set names for AWS attributes
  // and must be less than or equal to 64 characters.
  const name = `${STACK_PREFIX}--${attributeName}`;
  return name.length > 64 ? name.slice(0, 64) : name;
}
