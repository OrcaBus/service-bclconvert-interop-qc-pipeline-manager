#!/usr/bin/env python3

"""
Convert s3 uri to ICAv2 URI py
"""

# Standard imports
from urllib.parse import urlparse, urlunparse
from pathlib import Path

# Wrapica imports
from wrapica.project_data import (
    convert_uri_to_project_data_obj,
    convert_project_data_obj_to_uri,
    create_file_in_project, create_folder_in_project
)

# Layer imports
from icav2_tools import set_icav2_env_vars


def handler(event, context):
    """
    Convert the s3 output uri to ICAv2 uri
    :param event:
    :param context:
    :return:
    """
    # Set icav2 env vars
    set_icav2_env_vars()

    # Create the folder if it does not exist
    try:
        convert_uri_to_project_data_obj(
            event["s3Uri"]
        )
    except FileNotFoundError as e:
        # Create the parent directory
        bucket = urlparse(event["s3Uri"]).netloc
        parent_dir = str(Path(urlparse(event["s3Uri"]).path).parent) + "/"
        parent_data_obj = convert_uri_to_project_data_obj(
            str(urlunparse((
                "s3", bucket, parent_dir,
                None, None, None
            ))),
            create_data_if_not_found=True
        )

        return {
            "icav2Uri": (
                convert_project_data_obj_to_uri(
                    parent_data_obj,
                    uri_type='icav2'
                ) + Path(urlparse(event["s3Uri"]).path).name
            )
        }

    return {
        "icav2Uri": convert_project_data_obj_to_uri(
            convert_uri_to_project_data_obj(
                event["s3Uri"]
            ),
            uri_type='icav2'
        )
    }
