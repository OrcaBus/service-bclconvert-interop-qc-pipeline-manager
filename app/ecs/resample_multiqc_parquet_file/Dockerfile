FROM debian:bookworm

ARG TARGETPLATFORM

ARG WRAPICA_VERSION="2.40.0.dev20251005111713"
ARG PYARROW_VERSION="21.0.0"
ARG PANDAS_VERSION="2.3.3"
ARG PYTHON_VERSION="3.12"

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
  apt install -yq \
    wget \
    curl \
    jq \
    unzip && \
  # Install wrapica and other python deps \
  uv pip install \
    --index-url "https://pypi.org/simple" \
    --extra-index-url "https://test.pypi.org/simple" \
    --index-strategy unsafe-best-match \
    wrapica=="${WRAPICA_VERSION}" \
    pyarrow=="${PYARROW_VERSION}" \
    pandas=="${PANDAS_VERSION}" \
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
