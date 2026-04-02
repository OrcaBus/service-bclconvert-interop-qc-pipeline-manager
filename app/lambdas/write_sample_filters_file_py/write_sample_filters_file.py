#!/usr/bin/env python3

"""
Write the sample filters file from yaml to json

But we need to change

- button: Lane 1
  mode: show
  pattern: ["_L1","(L1)","Lane 1"]
- button: WGS|TsqNano
  mode: show
  pattern: ["L2600001", "L2600002", "L2600003"]

to

Lane 1<tab>show<tab>_L1<tab>(L1)<tab>Lane 1
WGS<tab>...

"""

# Standard imports
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse, urlunparse

# Wrapica imports
from wrapica.project_data import (
    write_icav2_file_contents,
    convert_uri_to_project_data_obj
)

# Layer imports
from icav2_tools import set_icav2_env_vars


def handler(event, context):
    # Set env vars
    set_icav2_env_vars()

    # Get inputs
    sample_filters_file_uri = event.get("sampleFiltersFileUri")
    sample_filters_json = event.get("sampleFiltersJson")

    # Get tsv lines
    sample_filters_tsv_lines = []
    for sample_filters_json_iter in sample_filters_json:
        sample_filters_tsv_lines.append(
            '\t'.join([
                sample_filters_json_iter['button'],
                sample_filters_json_iter['mode'],
                *sample_filters_json_iter['patternList'],
            ])
        )

    sample_filters_file_uri_obj = urlparse(
        sample_filters_file_uri
    )
    sample_filters_folder_uri = str(urlunparse(
        (
            sample_filters_file_uri_obj.scheme,
            sample_filters_file_uri_obj.netloc,
            str(Path(sample_filters_file_uri_obj.path).parent),
            None, None, None
        )
    ))

    # Get the project file uri object
    icav2_project_data_parent_object = convert_uri_to_project_data_obj(
        sample_filters_folder_uri,
        create_data_if_not_found=True
    )

    # Write out then read in
    with NamedTemporaryFile(suffix=".tsv", mode='w', encoding='utf-8') as file_h:
        # Write file contents
        file_h.write(
            '\n'.join(sample_filters_tsv_lines) + '\n'
        )
        file_h.flush()

        # Write out to icav2
        write_icav2_file_contents(
            project_id=icav2_project_data_parent_object.project_id,
            data_path=Path(str(icav2_project_data_parent_object.data.details.path)) / Path(sample_filters_file_uri_obj.path).name,
            file_stream_or_path=Path(file_h.name)
        )
