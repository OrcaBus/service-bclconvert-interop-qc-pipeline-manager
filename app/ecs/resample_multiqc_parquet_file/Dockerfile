FROM ubuntu:noble

ARG TARGETPLATFORM

ARG WRAPICA_VERSION="2.40.0.dev20251005111713"
ARG PYARROW_VERSION="21.0.0"
ARG PANDAS_VERSION="2.3.3"
ARG PYTHON_VERSION="3.12"
ARG BOTO3_VERSION="1.40.57"
ARG UV_INSTALL_URL="https://astral.sh/uv/install.sh"

LABEL maintainer="Alexis Lucattini"


RUN \
  # Set the platform URL based on the TARGETPLATFORM argument \
  if [ "${TARGETPLATFORM#linux/}" = "arm64" ]; then \
    platform_url="aarch64";  \
  else \
    platform_url="x86_64"; \
  fi && \
  # Standard setup \
  apt update -yq && \
  apt upgrade -yq && \
  # Install dependencies \
  # build-essentials required for pyarrow installation \
  apt install -yq \
    wget \
    curl \
    jq \
    python3 \
    unzip && \
  # Installing UV \
  curl --fail --silent --show-error --location \
    "${UV_INSTALL_URL}" | \
  XDG_CONFIG_HOME=/tmp UV_INSTALL_DIR=/usr/bin sh && \
  # Install wrapica and other python deps \
  uv venv && \
  uv pip install --upgrade pip && \
  uv pip install \
    pyarrow=="${PYARROW_VERSION}" \
    pandas=="${PANDAS_VERSION}" \
    boto3=="${BOTO3_VERSION}" && \
  uv pip install \
    --default-index "https://pypi.org/simple" \
    --index "https://test.pypi.org/simple" \
    --index-strategy unsafe-best-match \
    wrapica=="${WRAPICA_VERSION}" && \
  # Install the aws cli \
  ( \
      wget \
        --quiet \
        --output-document "awscliv2.zip" \
        "https://awscli.amazonaws.com/awscli-exe-linux-${platform_url}.zip" && \
      unzip -q "awscliv2.zip" && \
      ./aws/install && \
      rm -rf "awscliv2.zip" "aws" \
  )

# Install entrypoint script
COPY docker-entrypoint.sh "docker-entrypoint.sh"

# Install the scripts
COPY scripts/ scripts/

# Make the docker entrypoint executable
RUN chmod +x "./docker-entrypoint.sh"

# Set the entrypoint as the docker entrypoint script
CMD [ "./docker-entrypoint.sh" ]
