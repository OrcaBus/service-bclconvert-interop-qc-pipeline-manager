#!/usr/bin/env python3

"""
Using the https://docs.seqera.io/multiqc/reports/customisation field,

We generate a json blob

- button: Lane 1
  mode: show
  patternList:
    - "_L1"
    - "(L1)"
    - "Lane 1"
- button: WGS|TsqNano
  mode: show
  patternList:
    - "L2600001"
    - "L2600002"
    - "L2600003"
...

The json blob will then be generated into a tsv file
"""

# Standard imports
from typing import List
import pandas as pd

# Layer imports
from orcabus_api_tools.sequence import get_libraries_from_instrument_run_id
from orcabus_api_tools.metadata import get_libraries_list_from_library_id_list
from orcabus_api_tools.fastq import get_fastqs_in_libraries_and_instrument_run_id


def handler(event, context):
    # Get the instrument run id as the input
    instrument_run_id = event.get("instrumentRunId")

    # Initialise the outputs
    sample_filters_json = []

    # Get library ids from the instrument run id
    library_id_list = get_libraries_from_instrument_run_id(instrument_run_id)

    # Get the lane ids
    lane_list: List[int] = list(set(
        list(map(
            lambda fastq_iter_: fastq_iter_['lane'],
            get_fastqs_in_libraries_and_instrument_run_id(
                instrument_run_id=instrument_run_id,
                library_id_list=library_id_list
            )
        ))
    ))

    # Create lanes buttons
    for lane_iter_ in lane_list:
        sample_filters_json.append(
            {
                "button": f"Lane {lane_iter_}",
                "mode": "show",
                "patternList": [
                    f"_L{lane_iter_}",
                    f"(L{lane_iter_})",
                    f"Lane {lane_iter_}"
                ],
            }
        )

    # Get the library objects from the instrument run ids
    library_object_df = pd.DataFrame(get_libraries_list_from_library_id_list(library_id_list))
    library_object_df["projectId"] = library_object_df['projectSet'].apply(lambda project_set_iter_: project_set_iter_[-1]['name'])

    # Collect the following combinations
    for (sample_type, assay), sample_type_assay_df in library_object_df.groupby(['type', 'assay']):
        project_id_list = list(set(
            sample_type_assay_df['projectSet'].apply(lambda project_set_iter_: project_set_iter_[-1]['name']).tolist()
        ))

        # If not a single project make a combined entry of type/assay
        if not len(project_id_list) == 1:
            sample_filters_json.append(
                {
                    "button": f"{sample_type}|{assay}",
                    "mode": "show",
                    "patternList": sample_type_assay_df['libraryId'].tolist()
                }
            )

        for project_id, sample_type_assay_project_df in sample_type_assay_df.groupby(['projectId']):
            # Get libraries with matching project id
            sample_filters_json.append(
                {
                    "button": f"{sample_type}|{assay}|{project_id}",
                    "mode": "show",
                    "patternList": sample_type_assay_project_df['libraryId'].tolist()
                }
            )

    return {
        "sampleFiltersJson": sample_filters_json
    }
