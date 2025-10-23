#!/usr/bin/env bash

# Set to fail
set -euo pipefail

# Quick function to log messages to stderr
echo_stderr(){
  echo "$(date -Iseconds)" "$@" >&2
}

# Confirm the following environment variables are set
# HOSTNAME_SSM_PARAMETER_NAME - static
# ORCABUS_TOKEN_SECRET_ID - static
# ICAV2_ACCESS_TOKEN_SECRET_ID - static
# INPUT_URI - dynamic
# OUTPUT_URI - dynamic
# OLD_SAMPLE_NAME - dynamic
# NEW_SAMPLE_NAME - dynamic

if [[ -z "${HOSTNAME_SSM_PARAMETER_NAME:-}" ]]; then
  echo_stderr "HOSTNAME_SSM_PARAMETER_NAME is not set. Exiting."
  exit 1
fi

if [[ -z "${ORCABUS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ORCABUS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${ICAV2_ACCESS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ICAV2_ACCESS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${INPUT_URI:-}" ]]; then
  echo_stderr "INPUT_URI is not set. Exiting."
  exit 1
fi

if [[ -z "${OUTPUT_URI:-}" ]]; then
  echo_stderr "OUTPUT_URI is not set. Exiting."
  exit 1
fi

if [[ -z "${OLD_SAMPLE_NAME:-}" ]]; then
  echo_stderr "OLD_SAMPLE_NAME is not set. Exiting."
  exit 1
fi

if [[ -z "${NEW_SAMPLE_NAME:-}" ]]; then
  echo_stderr "NEW_SAMPLE_NAME is not set. Exiting."
  exit 1
fi

HOSTNAME="$( \
  aws ssm get-parameter \
	--name "${HOSTNAME_SSM_PARAMETER_NAME}" \
	--output json | \
  jq --raw-output \
    '.Parameter.Value' \
)"

ORCABUS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id orcabus/token-service-jwt \
    --output json \
    --query SecretString | \
  jq --raw-output \
    'fromjson | .id_token' \
)"

# Set ICAV2_ACCESS_TOKEN environment variable
ICAV2_ACCESS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id "${ICAV2_ACCESS_TOKEN_SECRET_ID}" \
    --output json | \
  jq --raw-output '.SecretString' \
)"
export ICAV2_ACCESS_TOKEN

# Download the input file from the filemanager
input_uri_bucket="$( \
  uv run python3 -c "from urllib.parse import urlparse; print(urlparse('${INPUT_URI}').netloc)" \
)"
input_uri_key="$( \
  uv run python3 -c "from urllib.parse import urlparse; print(urlparse('${INPUT_URI}').path.lstrip('/'))" \
)"

input_object_id="$( \
  curl --fail --silent --location --show-error \
    --request 'GET' \
    --header "Accept: application/json" \
    --header "Authorization: Bearer ${ORCABUS_TOKEN}" \
    --data "$( \
      jq --raw-output --null-input \
	   --arg bucket "${input_uri_bucket}" \
	   --arg key "${input_uri_key}" \
	   '
		 {
		   "bucket": $bucket,
		   "key": $key
		 } |
		 to_entries |
		 map("\(.key)=\(.value)") |
		 join("&")
	   ' \
    )" \
    --get \
    --url "https://file.${HOSTNAME}/api/v1/s3" | \
  jq --raw-output \
    '
      .results[0].s3ObjectId
    ' \
)"

# Get the presigned url for the input file
# We still need to pipe into jq as the output is wrapped in quotes
input_presigned_url="$( \
  curl --fail --silent --location --show-error \
    --request 'GET' \
    --header "Accept: application/json" \
	--header "Authorization: Bearer ${ORCABUS_TOKEN}" \
    --url "https://file.${HOSTNAME}/api/v1/s3/presign/${input_object_id}?responseContentDisposition=inline" | \
  jq --raw-output \
)"

# Download the input file using the presigned url
echo_stderr "Downloading input multiqc parquet file from presigned URL"
wget --quiet \
  --output-document "multiqc.parquet" \
  "${input_presigned_url}"

# Run the conversion (in-place)
echo_stderr "Running sample name update from '${OLD_SAMPLE_NAME}' to '${NEW_SAMPLE_NAME}' in multiqc parquet file"
uv run python3 scripts/update_sample_names_in_parquet_files.py \
  --input-parquet-file "multiqc.parquet" \
  --output-parquet-file "multiqc.parquet" \
  --old-sample-name "${OLD_SAMPLE_NAME}" \
  --new-sample-name "${NEW_SAMPLE_NAME}"

# Upload the output file to the new location
echo_stderr "Uploading updated multiqc parquet file to '${OUTPUT_URI}'"
uv run python3 scripts/upload_file_to_icav2.py \
  --input-file "multiqc.parquet" \
  --output-uri "${OUTPUT_URI}"
