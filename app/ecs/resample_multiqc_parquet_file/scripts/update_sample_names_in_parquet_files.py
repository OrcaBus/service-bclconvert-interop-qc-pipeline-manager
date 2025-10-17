#!/usr/bin/env python3

"""
Given a multiqc parquet file, update the former names to the new names


Steps are as follows:
* Read the parquet file into a pandas DataFrame

* Iterate through each item and replace the old sample name with the new sample name

For plot input types we perform the following:
* Load the JSON string into a Python dictionary where the 'data' key contains a dict
* The name is the top level key, so we need to iterate through the 'data' dict and replace the one key

For plot input row we only need to perform the following:
* Update the 'sample' column in the DataFrame. The sample column contains the sample names to be replaced.

Once completed, we write the updated DataFrame back to a parquet file.
* Write the updated DataFrame back to a parquet file

"""


# Standard imports
import argparse
import json
from typing import cast
import pandas as pd


def recursively_replace_name(d, old_name, new_name):
    """
    Recursively replace names in a nested dictionary for both key AND value matches
    :param d: The dictionary to update
    :param old_name: The name to replace
    :param new_name: The new name
    :return: The updated dictionary
    """
    if isinstance(d, dict):
        return {
            (
                new_name
                if k == old_name
                else k
            ): recursively_replace_name(v, old_name, new_name)
            for k, v in
            d.items()
        }
    elif isinstance(d, list):
        return [
            recursively_replace_name(i, old_name, new_name)
            for i in d
        ]
    elif isinstance(d, str):
        return new_name if d == old_name else d
    return d


def update_plot_input(
        plot_input_data: str,
        old_sample_name: str,
        new_sample_name: str
) -> str:
    """
    Given a plot input data JSON string, update the sample names in the 'data' key
    :param plot_input_data:
    :param old_sample_name:
    :param new_sample_name:
    :return:
    """
    return json.dumps(
        list(map(
            lambda x: recursively_replace_name(
                x,
                old_sample_name,
                new_sample_name
            ),
            json.loads(plot_input_data)
        ))
    )


def update_plot_input_row(
        series: pd.Series,
        new_sample_name: str
) -> pd.Series:
    """
    Given a series, update the sample names in the 'sample' column
    :param series:
    :param new_sample_name:
    :return:
    """
    series = series.copy()
    series['sample'] = new_sample_name

    return series


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
        description="Edit a parquet file and upload it to a new location."
    )

    # IO
    args.add_argument(
        "--input-parquet-file",
        type=str,
        required=True,
        help="The path to the parquet file to be updated."
    )

    args.add_argument(
        "--output-parquet-file",
        type=str,
        required=True,
        help="The path to the output parquet file. May be the same as the input file."
    )

    # Naming args
    args.add_argument(
        "--old-sample-name",
        type=str,
        required=True,
        help="The old name of the sample to be replaced."
    )
    args.add_argument(
        "--new-sample-name",
        type=str,
        required=True,
        help="The new name of the sample to replace with."
    )

    return args.parse_args()


def main():
    """
    Given a parquet file as input, update the sample names in the file
    :return:
    """

    # Get args
    args = get_args()

    # Read the parquet file into a pandas DataFrame
    df = pd.read_parquet(args.input_parquet_file)

    # Iterate through each item and replace the old sample name with the new sample name
    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        if row['type'] == 'plot_input':
            # Update the plot input data
            df.loc[index, 'plot_input_data'] = update_plot_input(
                plot_input_data=cast(str, cast(object, row['plot_input_data'])),
                old_sample_name=args.old_sample_name,
                new_sample_name=args.new_sample_name
            )
        elif row['type'] == 'plot_input_row':
            # Update the plot input row
            df.loc[index, :] = update_plot_input_row(
                series=row,
                new_sample_name=args.new_sample_name
            )

    # Write the updated DataFrame back to a parquet file
    df.to_parquet(args.output_parquet_file, index=False)


if __name__ == "__main__":
    main()
