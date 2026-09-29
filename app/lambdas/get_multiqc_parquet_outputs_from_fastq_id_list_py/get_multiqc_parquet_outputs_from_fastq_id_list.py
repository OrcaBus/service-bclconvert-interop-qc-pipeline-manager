#!/usr/bin/env python3

"""
Given a list of fastq ids, return a list containing the following properties

* "fastqId"
* "libraryId"
* "lane"
* "multiqcParquetFile"


"""

# Layer imports
from functools import reduce
from operator import concat
from orcabus_api_tools.fastq import get_fastq


def handler(event, context):
    """
    Return a list of objects
    :param event:
    :param context:
    :return:
    """
    # Get the fastq id list from the event
    fastq_id_list = event.get("fastqIdList", [])

    # Get the fastq objects
    fastq_objs = list(map(
        lambda fastq_id_iter_: get_fastq(
            fastq_id_iter_,
            includeS3Details=True
        ),
        fastq_id_list
    ))

    # Return the response with the desired properties
    return {
        "multiqcOutputObjects": list(filter(
            lambda fastq_parquet_iter_: fastq_parquet_iter_['multiqcParquetFileUri'] is not None,
            list(reduce(
                concat,
                list(map(
                    lambda fastq_obj_iter_: [
                        {
                            "fastqId": fastq_obj_iter_['id'],
                            "libraryId": fastq_obj_iter_['library']['libraryId'],
                            "lane": fastq_obj_iter_['lane'],
                            "multiqcParquetFileUri": fastq_obj_iter_['qc']['sequaliReports']['multiqcParquet']['s3Uri'],
                            "tool": "sequali"
                        },
                        {
                            "fastqId": fastq_obj_iter_['id'],
                            "libraryId": fastq_obj_iter_['library']['libraryId'],
                            "lane": fastq_obj_iter_['lane'],
                            "multiqcParquetFileUri": fastq_obj_iter_['qc'].get('picard', {}).get('multiqcParquet', {}).get('s3Uri', None),
                            "tool": "picard"
                        }
                    ],
                    fastq_objs
                ))
            ))
        ))
    }
