#!/usr/bin/env bash

# Set to fail
set -euo pipefail

set -o xtrace

# Globals
LAMBDA_FUNCTION_NAME="WruDraftValidator"

# CLI Defaults
FORCE=false  # Use --force to set to true

# Workflow settings
WORKFLOW_NAME="bclconvert-interop-qc"
WORKFLOW_VERSION="1.5.0--1.31"
EXECUTION_ENGINE="ICA"
CODE_VERSION="ea35fcd"
PAYLOAD_VERSION="2025.05.29"

SRM_DOMAIN="sequence"

# Glocals
INSTRUMENT_RUN_ID=""

# Functions
echo_stderr(){
  echo "$(date -Iseconds)" "$@" >&2
}

print_usage(){
  echo "
generate-WRU-draft.sh [-h | --help]
generate-WRU-draft.sh (instrument_run_id)
                      [-f | --force]
                      [-o | --output-uri-prefix <s3_uri>]
                      [-l | --logs-uri-prefix <s3_uri>]
                      [-p | --project-id <project_id>]

Description:
Run this script to generate a draft WorkflowRunUpdate event for the specified library IDs.

Positional arguments:
  instrument_run_id:  The instrument run id to run bclconvert-interop-qc against.

Keyword arguments:
  -h | --help:               Print this help message and exit.
  -f | --force:              Don't confirm before pushing the event to EventBridge.

Environment:
  AWS_PROFILE:  (Optional) The AWS CLI profile to use for authentication.
  AWS_REGION:   (Optional) The AWS region to use for AWS CLI commands.

Example usage:
bash generate-WRU-draft.sh <instrument_run_id>
"
}

get_hostname_from_ssm(){
  aws ssm get-parameter \
    --name "/hosted_zone/umccr/name" \
    --output json | \
  jq --raw-output \
    '.Parameter.Value'
}

get_orcabus_token(){
  aws secretsmanager get-secret-value \
    --secret-id orcabus/token-service-jwt \
    --output json \
    --query SecretString | \
  jq --raw-output \
    'fromjson | .id_token'
}

get_library_obj_from_library_id(){
  local library_id="$1"
  curl --silent --fail --show-error --location \
    --header "Authorization: Bearer $(get_orcabus_token)" \
    --url "https://metadata.$(get_hostname_from_ssm)/api/v1/library?libraryId=${library_id}" | \
  jq --raw-output \
    '
      .results[0] |
      {
        "libraryId": .libraryId,
        "orcabusId": .orcabusId
      }
    '
}

get_lambda_function_name(){
  aws lambda list-functions \
    --output json \
    --query "Functions" | \
  jq --raw-output --compact-output \
    --arg functionName "${LAMBDA_FUNCTION_NAME}" \
    '
      map(select(.FunctionName | contains($functionName))) |
      .[0].FunctionName
    '
}

generate_portal_run_id(){
  echo "$(date -u +'%Y%m%d')$(openssl rand -hex 4)"
}

get_libraries(){
  local instrument_run_id="$1"
  local libraries_in_instrument_run_id

  libraries_in_instrument_run_id="$( \
	curl \
	  --fail --silent --location --show-error \
	  --request "GET" \
	  --header "Accept: application/json" \
	  --header "Authorization: Bearer $(get_orcabus_token)" \
	  --url "https://${SRM_DOMAIN}.$(get_hostname_from_ssm)/api/v1/sequence/${instrument_run_id}/sequence_run/" | \
	jq --raw-output \
	  '
		.[0].libraries
	  ' \
  )"

  # For each library get the library object pair and then slurp into an array
  for library_id in $(jq --raw-output '.[]' <<< "${libraries_in_instrument_run_id}"); do
    get_library_obj_from_library_id "${library_id}"
  done | \
  jq --slurp --compact-output --raw-output
}

get_workflow(){
  local workflow_name="$1"
  local workflow_version="$2"
  local execution_engine="$3"
  local code_version="$4"
  curl --silent --fail --show-error --location \
    --request GET \
    --get \
    --header "Authorization: Bearer $(get_orcabus_token)" \
    --url "https://workflow.$(get_hostname_from_ssm)/api/v1/workflow" \
    --data "$( \
      jq \
       --null-input --compact-output --raw-output \
       --arg workflowName "$workflow_name" \
       --arg workflowVersion "$workflow_version" \
       --arg executionEngine "$execution_engine" \
       --arg codeVersion "$code_version" \
       '
         {
            "name": $workflowName,
            "version": $workflowVersion,
			"executionEngine": $executionEngine,
            "codeVersion": $codeVersion,
         } |
         to_entries |
         map(
           "\(.key)=\(.value)"
         ) |
         join("&")
       ' \
    )" | \
  jq --compact-output --raw-output \
    '
      .results[0]
    '
}


# Get args
# Get args
while [[ $# -gt 0 ]]; do
  case "$1" in
  	# Help
    -h|--help)
      print_usage
      exit 0
      ;;
  	# Force boolean
    -f|--force)
      FORCE=true
      shift
      ;;
  	# Unexpected keyword argument
	-*)
	  echo_stderr "Error: Unknown option: $1"
	  print_usage
	  exit 1
	  ;;
	# Positional arguments (instrument run id)
    *)
      # Check if INSTRUMENT_RUN_ID is already set
      if [[ -n "${INSTRUMENT_RUN_ID}" ]]; then
        echo_stderr "Error: Multiple instrument run IDs provided. Only one is allowed."
        print_usage
        exit 1
	  fi
      INSTRUMENT_RUN_ID="$1"
      shift
      ;;
  esac
done

# Generate the portal run id
portal_run_id="$(generate_portal_run_id)"
echo_stderr "Generated Portal Run ID: ${portal_run_id}"

# Get the workflow object
workflow="$( \
  get_workflow \
    "${WORKFLOW_NAME}" "${WORKFLOW_VERSION}" \
    "${EXECUTION_ENGINE}" "${CODE_VERSION}"
)"
echo_stderr "Using workflow: $(jq --raw-output '.orcabusId' <<< "${workflow}")"


# Generate the event
lambda_payload="$( \
  jq --null-input --raw-output \
    --argjson workflow "${workflow}" \
    --arg payloadVersion "${PAYLOAD_VERSION}" \
    --arg portalRunId "${portal_run_id}" \
    --argjson libraries "$(get_linked_libraries)" \
    '
	  {
		"status": "DRAFT",
		"timestamp": (now | todateiso8601),
		"workflow": $workflow,
		"workflowRunName": ("umccr--manual--" + $workflow["name"] + "--" + ($workflow["version"] | gsub("\\."; "-")) + "--" + $portalRunId),
		"portalRunId": $portalRunId,
		"libraries": $libraries,
	  }
    ' \
)"

# Confirm before pushing the event
if [[ "${FORCE}" == "false" ]]; then
    echo_stderr "Send the following payload to the lambda object:"
    jq --raw-output <<< "${lambda_payload}" 1>&2

    read -r -p 'Confirm to push this event to EventBridge? (y/n): ' confirm_push
    if [[ ! "${confirm_push}" =~ ^[Yy]$ ]]; then
      echo_stderr "Aborting event push."
      exit 1
    fi
fi

# Push the event to EventBridge
mkfifo lambda_data_pipe
errors_json="$(mktemp "errors.XXXXXX.json")"
echo_stderr "Pushing the draft event for portalRunId ${portal_run_id} via WRU Validation Lambda Function"
aws lambda invoke \
  --function-name "$(get_lambda_function_name)" \
  --payload "$(jq --compact-output <<< "${lambda_payload}")" \
  --cli-binary-format raw-in-base64-out \
  --no-cli-pager \
  --invocation-type 'RequestResponse' \
  lambda_data_pipe 1>/dev/null & \
jq --raw-output \
  '
    if .statusCode != 200 then
	  .body | fromjson
	else
	  empty
	end
  ' \
  < lambda_data_pipe \
  > "${errors_json}" & \
wait
rm lambda_data_pipe

if [[ -s "${errors_json}" ]]; then
  echo_stderr "Error pushing event to Lambda Function:"
  jq --raw-output '.' < "${errors_json}" 1>&2
  rm "${errors_json}"
  exit 1
else
  rm "${errors_json}"
fi

echo_stderr "Waiting for the workflow run to be registered by the workflow manager"

while :; do
  workflow_run_object="$( \
  	get_workflow_run "${portal_run_id}"
  )"

  # Check with the workflow manager for the workflow run object
  if [[ -n "${workflow_run_object}" ]]; then
    workflow_run_orcabus_id="$(jq --raw-output '.orcabusId' <<< "${workflow_run_object}")"
	echo_stderr "Workflow run registered with ID: ${workflow_run_orcabus_id}"
	break
  else
	echo_stderr "Workflow run not yet registered, waiting 10 seconds..."
	sleep 10
  fi
done

echo_stderr "Workflow Run Creation Event complete!"
echo_stderr "Please head to 'https://orcaui.$(get_hostname_from_ssm)/runs/workflow/${workflow_run_orcabus_id}' to track the status of the workflow run"
