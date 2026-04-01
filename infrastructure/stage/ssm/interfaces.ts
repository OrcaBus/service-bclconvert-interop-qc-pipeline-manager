export interface SsmParameterValues {
  // Payload defaults
  workflowName: string;
  defaultPayloadVersion: string;
  workflowVersion: string;

  // Engine Parameter defaults
  pipelineIdsByWorkflowVersionMap: Record<string, string>;
  icav2ProjectId: string;
  logsPrefix: string;
  outputPrefix: string;
  cachePrefix: string;
}

export interface SsmParameterPaths {
  // Top level parameters
  ssmRootPrefix: string;

  // Payload parameters
  workflowName: string;
  workflowVersion: string;
  defaultPayloadVersion: string;

  // Engine parameters
  prefixPipelineIdsByWorkflowVersion: string;
  icav2ProjectId: string;
  logsPrefix: string;
  outputPrefix: string;
  cachePrefix: string;
}

export interface BuildSsmParameterProps {
  ssmParameterValues: SsmParameterValues;
  ssmParameterPaths: SsmParameterPaths;
}
