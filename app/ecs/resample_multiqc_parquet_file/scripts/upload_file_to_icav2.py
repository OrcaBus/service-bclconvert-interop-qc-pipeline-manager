#!/usr/bin/env python3

"""
Given a file and an upload url, upload the file to the url.
"""
# Standard imports
import argparse
from pathlib import Path
from subprocess import run
from tempfile import NamedTemporaryFile
from textwrap import dedent
from urllib.parse import urlparse, urlunparse

# Wrapica imports
from wrapica.project_data import convert_uri_to_project_data_obj, create_file_with_upload_url

# Globals
MULTIQC_PARQUET_NAME = "multiqc.parquet"


def get_shell_script_template() -> str:
    return dedent(
        """
        #!/usr/bin/env bash

        set -euo pipefail

        # This actually loads the entire file into memory before uploading it
        curl --fail-with-body --silent --show-error --location \
          --request PUT \
          --header 'Content-Type: application/octet-stream' \
          --data-binary "@-" \
          --url "__UPLOAD_PRESIGNED_URL__" < "__INPUT_FILE__"
        """
    )


def generate_shell_script(
        input_file: str,
        destination_file_upload_url: str,
):
    # Create a temp file
    temp_file_path = NamedTemporaryFile(
        delete=False,
        suffix=".sh"
    ).name

    # Write the shell script to the temp file
    with open(temp_file_path, "w") as temp_file_h:
        temp_file_h.write(
            get_shell_script_template().replace(
                "__INPUT_FILE__", input_file
            ).replace(
                "__UPLOAD_PRESIGNED_URL__", destination_file_upload_url
            ) + "\n"
        )

    return temp_file_path


def run_shell_script(
        shell_script_path: str,
):
    """
    Run the shell script with the following environment variables set
    :param shell_script_path:
    :return:
    """
    proc = run(
        [
            "bash", shell_script_path
        ],
        capture_output=True
    )

    if not proc.returncode == 0:
        raise RuntimeError(
            f"Failed to run shell script {shell_script_path} with return code {proc.returncode}. "
            f"Stdout was {proc.stdout.decode()}"
            f"Stderr was {proc.stderr.decode()}"
        )

    return


def get_args():
    """
    Use argparse, to get the arguments from the command line.
    We collect the following arguments
    * --source-project-id
    * --source-data-id
    * --destination-project-id
    * --destination-data-id
    :return:
    """
    # Get args
    args = argparse.ArgumentParser(
        description="Upload a single part file to ICAv2 with curl PUT"
    )

    # Source args
    args.add_argument(
        "--input-file",
        type=str,
        required=True,
        help="The input file to be uploaded."
    )
    args.add_argument(
        "--output-uri",
        type=str,
        required=True,
        help="The output uri where the file should be uploaded to."
    )

    return args.parse_args()


def main():
    """
    Given the inputs of a local file and an output uri,
    perform the following steps:
    1. Create an upload uri in the destination folder
    2. Create a shell script that uses curl to upload the file to the upload uri
    :return:
    """
    args = get_args()

    # Get the parent uri of the destination uri
    destination_uri_obj = urlparse(args.output_uri)
    parent_uri = str(Path(destination_uri_obj.path).parent) + "/"

    destination_folder_uri = str(urlunparse((
        destination_uri_obj.scheme,
        destination_uri_obj.netloc,
        parent_uri,
        None, None, None
    )))

    # Get the destination folder object
    destination_folder_object = convert_uri_to_project_data_obj(
        destination_folder_uri,
        create_data_if_not_found=True
    )

    # Create the upload url
    # Create the file object
    destination_file_upload_url = create_file_with_upload_url(
        project_id=destination_folder_object.project_id,
        folder_id=destination_folder_object.data.id,
        file_name=MULTIQC_PARQUET_NAME
    )

    # Get the shell script
    shell_script_path = generate_shell_script(
        input_file=args.input_file,
        destination_file_upload_url=destination_file_upload_url
    )

    # Run the shell script
    run_shell_script(
        shell_script_path=shell_script_path,
    )
