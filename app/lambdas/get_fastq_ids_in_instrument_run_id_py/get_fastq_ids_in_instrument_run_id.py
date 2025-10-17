#!/usr/bin/env python3

"""
Get Fastq IDs in Instrument Run IDs

"""

# Imports
from orcabus_api_tools.fastq import get_fastqs_in_instrument_run_id


def handler(event, context):
    """
    Given an instrument run id, return a list of fastq ids in that run.
    :param event:
    :param context:
    :return:
    """
    return {
        "fastqIdList": get_fastqs_in_instrument_run_id(
            instrument_run_id=event['instrumentRunId']
        )
    }
