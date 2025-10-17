#!/usr/bin/env python3

"""
Generate a draft data event for bcl-convert interop QC results.
"""

# Layer imports
from orcabus_api_tools.workflow import (
    get_latest_payload_from_portal_run_id,
    get_workflow_run_from_portal_run_id
)

def handler(event, context):
    """
    Generate a draft data event for bcl-convert interop QC results.
    We take in the following inputs:
    * portalRunId
    * inputs
    * tags
    * engineParameters

    :param event:
    :param context:
    :return:
    """

    # Extract inputs from the event
    portal_run_id = event['portalRunId']
    inputs = event.get('inputs', {})
    tags = event.get('tags', [])
    engine_parameters = event.get('engineParameters', {})

    # Get the latest payload and workflow run details
    latest_payload = get_latest_payload_from_portal_run_id(portal_run_id)
    workflow_run = get_workflow_run_from_portal_run_id(portal_run_id)

    # Construct the draft data event
    draft_data_event = {
        "status": workflow_run['currentState']['status'],
        "portalRunId": portal_run_id,
        "workflow": workflow_run['workflow'],
        "workflowRunName": workflow_run['workflowRunName'],
        "libraries": workflow_run['libraries'],
        "payload": {
            "version": latest_payload["version"],
            "data": {
                "inputs": inputs,
                "tags": tags,
                "engineParameters": engine_parameters
            }
        }
    }

    return {
        "eventDetail": draft_data_event
    }
