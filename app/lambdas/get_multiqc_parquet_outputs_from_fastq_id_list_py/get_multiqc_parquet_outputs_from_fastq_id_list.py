#!/usr/bin/env python3

"""
Given a list of fastq ids, return a list containing the following properties

* "fastqId"
* "libraryId"
* "lane"
* "multiqcParquetFile"


"""

# Layer imports
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
        "multiqcOutputObject": list(map(
            lambda fastq_obj_iter_: {
                "fastqId": fastq_obj_iter_['id'],
                "libraryId": fastq_obj_iter_['library']['libraryId'],
                "lane": fastq_obj_iter_['lane'],
                "multiqcParquetFileUri": fastq_obj_iter_['qc']['sequaliReports']['multiqcParquet']['s3Uri']
            },
            fastq_objs
        ))
    }
