#!/usr/bin/env python3

"""
Convert s3 uri to ICAv2 URI py
"""

# Wrapica imports
from wrapica.project_data import convert_uri_to_project_data_obj, convert_project_data_obj_to_uri

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

    return {
        "icav2Uri": convert_project_data_obj_to_uri(
            convert_uri_to_project_data_obj(
                event["s3Uri"]
            ),
            uri_type='icav2'
        )
    }
