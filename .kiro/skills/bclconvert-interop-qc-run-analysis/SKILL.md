---
name: bclconvert-interop-qc-run-analysis
description: Analyse the quality of an Illumina sequencing run from the BCLConvert Interop QC pipeline output. Use when asked to QC or review a sequencing/instrument run, check clinical WGS coverage (tumor/normal, raw and deduplicated), investigate undetermined or unknown barcodes and possible index contamination, compare between-lane performance, group libraries by project/assay/type, or assess run-level Cluster PF, % Occupied and % >= Q30. Works from an instrument run ID or a portal run ID via Athena (orcavault/mart) and the MultiQC parquet in S3 (account 472057503814).
---

# BCLConvert Interop QC — Instrument Run Analysis

## Purpose

Analyse the quality of an Illumina sequencing run using the **BCLConvert Interop QC**
pipeline output. Given an **instrument run ID** (e.g. `260910_A01052_0320_AHTYW5DSXF`)
or a **portal run ID** (e.g. `20260910550177ed`), this skill lets you:

1. Locate the pipeline output in S3 (via Athena).
2. Pull the run's libraries and group them by project / assay / type.
3. Flag statistical outliers on the run.
4. Assess between-lane consistency for libraries spanning multiple lanes.
5. Verify clinical WGS coverage specs (tumor/normal, raw and deduplicated).
6. Inspect undetermined barcodes, filtering out poly-G index crashout.
7. Review run-level Cluster PF, % Occupied and % ≥ Q30 against Illumina guidance.

The deliverable is a Markdown report written to
`<instrument_run_id>_bclconvert_interop_qc_ai_observation_report.md` (see the
[Reporting Checklist](#reporting-checklist)).

All data lives in AWS account **`472057503814`**. Use the `umccr-production` CLI
profile (or assume a role in that account) with region **`ap-southeast-2`**.

> This skill was authored against real production data. Column names, `anchor`
> values, and `metric` names below are verified against
> `portal_run_id=20260910550177ed` (`260910_A01052_0320_AHTYW5DSXF`).

---

## Environment Setup

```sh
export AWS_PROFILE=umccr-production      # -> account 472057503814
export AWS_REGION=ap-southeast-2
# Sanity check
aws sts get-caller-identity
```

Tooling used below:

- **Athena** via the AWS CLI (catalog `orcavault`, database `mart`, workgroup `orcahouse`).
- **DuckDB** (Python `duckdb`, or the `duckdb` CLI) to query the MultiQC parquet.
  `pandas` + `pyarrow` also work if DuckDB is unavailable.

---

## Data Model Overview

### Athena (`orcavault` catalog → `mart` database)

| Table      | Key columns                                                                                                                                                    | Use                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `workflow` | `portal_run_id`, `library_id`, `workflow_name`, `workflow_version`, `workflow_status`, `workflow_start`, `workflow_end`, `workflow_comment`                    | Find the QC run. One row **per library** per run.                                        |
| `output`   | `portal_run_id`, `bucket`, `prefix`, `key_count`                                                                                                               | Resolve the S3 bucket/prefix of the output. Emits many rows per run — always `DISTINCT`. |
| `lims`     | `sequencing_run_id`, `sequencing_run_date`, `library_id`, `project_id`, `assay`, `type`, `phenotype`, `workflow`, `source`, `truseq_index`, subject/sample ids | Per-library metadata for grouping and clinical classification.                           |

**Run-ID linkage.** There is no `instrument_run_id` column on `workflow`. Match by
**date**: the `portal_run_id` starts with `YYYYMMDD`, and the `sequencing_run_id`
starts with `YYMMDD`. Both equal the sequencing date (`lims.sequencing_run_date`).

- `sequencing_run_id` = `260910_A01052_0320_AHTYW5DSXF` → date `2026-09-10`
- `portal_run_id` = `20260910550177ed` → date `2026-09-10`

**Clinical WGS classification** (for the coverage specs in Step 5):

```
type = 'WGS' AND workflow = 'clinical' AND phenotype IN ('tumor','normal')
```

### S3 output layout

**QC analysis output** (MultiQC parquet — the primary metrics source):

```
s3://<bucket>/<prefix>/multiqc/<instrument_run_id>_multiqc_report_data/multiqc.parquet
```

For the worked example:

```
s3://pipeline-prod-cache-503977275616-ap-southeast-2/byob-icav2/production/analysis/bclconvert-interop-qc/20260910550177ed/multiqc/260910_A01052_0320_AHTYW5DSXF_multiqc_report_data/multiqc.parquet
```

**BCLConvert primary `Reports/`** (raw demux inputs — the _full_ unknown-barcode list,
sample sheet, index-hopping). Keyed by the `bssh-to-aws-s3` copy portal run id, which
differs from the QC `portal_run_id` (see Step 5 for how to resolve it):

```
s3://<bucket>/byob-icav2/production/primary/<instrument_run_id>/<bssh_portal_run_id>/Reports/
```

### The MultiQC parquet (long format)

One tall table. Every metric value is a row. Columns you will use:

| Column            | Meaning                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `anchor`          | Which MultiQC table/plot the row belongs to (see anchor map below).                                    |
| `type`            | `plot_input_row` (a metric value), `plot_input` (plot config + embedded JSON data), or `run_metadata`. |
| `sample`          | Identifier — meaning depends on the anchor (library, `library_L<lane>`, or `<run> - Lane N - Read M`). |
| `metric`          | The metric name.                                                                                       |
| `val_raw`         | Numeric value (`DOUBLE`, may be `NaN`).                                                                |
| `val_fmt`         | Formatted string value (holds text like `"87.61 +/- 1.37"` or an index sequence).                      |
| `plot_input_data` | JSON blob for `plot_input` rows — holds bar-plot data (undetermined barcodes, per-lane counts).        |

**Anchor map:**

| `anchor`                           | Grain                         | Notable metrics                                                                                                                       |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `bclconvert-sample-stats-table`    | per library (`sample`=lib id) | `depth` (raw coverage), `clusters`, `yield`, `yield_q30`, `percent_yield_q30`, `mean_quality`, `percent_perfect_index_reads`, `index` |
| `bclconvert-lane-stats-table`      | per lane                      | `clusters`, `yield`, `percent_yield_q30`, `mean_quality`, index-read percentages                                                      |
| `general_stats_table`              | per `library_L<lane>`         | `sequali_duplication_percentage`, `sequali_gc_percentage`, `sequali_insert_size_estimate`, `sequali_total_reads`                      |
| `interop-runmetrics-detail-table`  | per `<run> - Lane N - Read M` | `Cluster PF`, `% Occupied`, `%>=Q30`, `Error`, `Density`, `Reads`, `Yield`                                                            |
| `interop-runmetrics-summary-table` | per read (run-level)          | `%>=Q30`, `Error Rate`, `Aligned`, `Yield`                                                                                            |
| `bclconvert_undetermined`          | `plot_input` bar plot         | Top-40 undetermined barcodes with per-lane counts (in `plot_input_data`)                                                              |
| `bclconvert_sample_counts`         | `plot_input` bar plot         | Clusters-by-sample per lane + index-mismatch datasets                                                                                 |

> **`bclconvert-sample-stats-table` gotcha:** each `(sample, metric)` has multiple
> rows — one grand-total plus one per lane the library ran on. The total is the
> largest, so use `MAX(val_raw)` to get the whole-library value (e.g. total `depth`).

> **`interop-runmetrics-detail-table` gotcha:** `Cluster PF`, `% Occupied` and
> `Error` are stored as `"mean +/- std"` strings in `val_fmt` (their `val_raw` is
> `NaN`). Parse the leading float. `%>=Q30` is numeric in `val_raw`.

---

## Step 0 — Resolve the run and its S3 output

Given an **instrument run ID**, get the date, then the portal run ID + output path.

```sql
-- Resolve portal_run_id + S3 output location from a sequencing (instrument) run id.
-- Instrument run id date (YYMMDD) == portal run id date (YYYYMMDD).
WITH run AS (
    SELECT DISTINCT sequencing_run_id, sequencing_run_date
    FROM lims
    WHERE sequencing_run_id = '260910_A01052_0320_AHTYW5DSXF'
)
SELECT
    w.portal_run_id,
    w.workflow_version,
    w.workflow_status,
    o.bucket,
    o.prefix
FROM workflow w
JOIN run r
  ON w.portal_run_id LIKE (format('%s%%', replace(cast(r.sequencing_run_date AS varchar), '-', '')))
LEFT JOIN (SELECT DISTINCT portal_run_id, bucket, prefix FROM output) o
  ON w.portal_run_id = o.portal_run_id
WHERE w.workflow_name = 'bclconvert-interop-qc'
  AND w.workflow_status = 'SUCCEEDED'
LIMIT 1;
```

If you already have the `portal_run_id`, skip straight to `output`:

```sql
SELECT DISTINCT bucket, prefix
FROM output
WHERE portal_run_id = '20260910550177ed';
```

Then download the parquet (the `multiqc` prefix contains one report dir per run):

```sh
PORTAL_RUN_ID=20260910550177ed
INSTRUMENT_RUN_ID=260910_A01052_0320_AHTYW5DSXF
BUCKET=pipeline-prod-cache-503977275616-ap-southeast-2
PREFIX="byob-icav2/production/analysis/bclconvert-interop-qc/${PORTAL_RUN_ID}"

aws s3 cp \
  "s3://${BUCKET}/${PREFIX}/multiqc/${INSTRUMENT_RUN_ID}_multiqc_report_data/multiqc.parquet" \
  ./multiqc.parquet
```

DuckDB can also read directly from S3 (`INSTALL httpfs; LOAD httpfs;` + `CREATE SECRET`
from the AWS credential chain), but downloading first is simpler and faster for repeated queries.

### Helper: running Athena from the CLI

```sh
run_athena() {  # usage: run_athena "SQL"
  local qid
  qid=$(aws athena start-query-execution \
    --query-string "$1" \
    --work-group orcahouse \
    --query-execution-context Catalog=orcavault,Database=mart \
    --output text --query 'QueryExecutionId')
  while :; do
    state=$(aws athena get-query-execution --query-execution-id "$qid" \
      --output text --query 'QueryExecution.Status.State')
    case "$state" in SUCCEEDED) break;; FAILED|CANCELLED)
      aws athena get-query-execution --query-execution-id "$qid" \
        --output text --query 'QueryExecution.Status.StateChangeReason'; return 1;; esac
    sleep 1
  done
  aws athena get-query-results --query-execution-id "$qid" --output json
}
```

---

## Step 1 — Libraries on the run, grouped by project / assay / type

```sql
-- Group libraries on the run by project, assay and type.
SELECT
    project_id,
    assay,
    type,
    phenotype,
    workflow,
    count(*)                    AS n_libraries,
    array_agg(library_id ORDER BY library_id) AS libraries
FROM lims
WHERE sequencing_run_id = '260910_A01052_0320_AHTYW5DSXF'
GROUP BY project_id, assay, type, phenotype, workflow
ORDER BY project_id, assay, type;
```

Keep this LIMS result — you will join it to the parquet metrics (on `library_id`)
for every downstream step.

---

## Step 2 — Per-library performance + outlier detection

Pull whole-library metrics from `bclconvert-sample-stats-table` (remember: total = `MAX`).

```sql
-- DuckDB. Whole-library metrics (one row per library).
SELECT
    sample AS library_id,
    max(CASE WHEN metric = 'depth'             THEN val_raw END) AS coverage_x,
    max(CASE WHEN metric = 'clusters'          THEN val_raw END) AS clusters,
    max(CASE WHEN metric = 'yield_q30'         THEN val_raw END) AS yield_q30_bp,
    max(CASE WHEN metric = 'percent_yield_q30' THEN val_raw END) AS pct_yield_q30,
    max(CASE WHEN metric = 'mean_quality'      THEN val_raw END) AS mean_quality,
    max(CASE WHEN metric = 'percent_perfect_index_reads' THEN val_raw END) AS pct_perfect_index
FROM read_parquet('multiqc.parquet')
WHERE anchor = 'bclconvert-sample-stats-table'
  AND type   = 'plot_input_row'
GROUP BY sample
ORDER BY coverage_x DESC;
```

**Outlier flagging.** Outliers are only meaningful _within a comparable group_
(same `assay`/`type`) — a ctDNA panel and a WGS library are not comparable. Join the
per-library table to LIMS, then flag with a robust rule per group. A median-absolute-deviation
(MAD) rule is more robust than mean±SD for small n:

```python
# Robust per-group outlier flag using median / MAD (modified z-score).
import duckdb, pandas as pd, numpy as np

df = duckdb.sql("""
    SELECT sample AS library_id,
           max(CASE WHEN metric='depth' THEN val_raw END)             AS coverage_x,
           max(CASE WHEN metric='percent_yield_q30' THEN val_raw END) AS pct_yield_q30,
           max(CASE WHEN metric='mean_quality' THEN val_raw END)      AS mean_quality
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='bclconvert-sample-stats-table' AND type='plot_input_row'
    GROUP BY sample
""").df()

# lims_df: library_id, project_id, assay, type  (from the Step 1 Athena query)
m = df.merge(lims_df, on="library_id", how="left")

def flag(group, col):
    x = group[col].astype(float)
    med = x.median()
    mad = (x - med).abs().median() or 1e-9
    group[f"{col}_mod_z"] = 0.6745 * (x - med) / mad
    group[f"{col}_outlier"] = group[f"{col}_mod_z"].abs() > 3.5   # common MAD cutoff
    return group

for col in ["coverage_x", "pct_yield_q30", "mean_quality"]:
    m = m.groupby(["assay", "type"], group_keys=False).apply(lambda g: flag(g, col))

print(m[m.filter(like="_outlier").any(axis=1)])
```

Report each flagged library with its group, the metric, its value, the group median,
and the modified z-score. Low coverage, low `% yield Q30`, or low `mean_quality`
relative to peers are the usual culprits.

---

## Step 3 — Between-lane consistency (multi-lane libraries)

Libraries spanning multiple lanes appear in `general_stats_table` as
`<library_id>_L<lane>` (one row per lane), and in `bclconvert_sample_counts` as
per-lane cluster counts. Check that a library performs consistently across lanes.

```sql
-- DuckDB. Per-lane Sequali metrics for multi-lane libraries.
WITH per_lane AS (
    SELECT
        regexp_extract(sample, '^(.*)_L[0-9]+$', 1) AS library_id,
        regexp_extract(sample, '_L([0-9]+)$', 1)    AS lane,
        max(CASE WHEN metric='sequali_total_reads'           THEN val_raw END) AS total_reads,
        max(CASE WHEN metric='sequali_duplication_percentage' THEN val_raw END) AS dup_pct,
        max(CASE WHEN metric='sequali_gc_percentage'          THEN val_raw END) AS gc_pct
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='general_stats_table' AND type='plot_input_row'
    GROUP BY sample
)
SELECT
    library_id,
    count(*)                                              AS n_lanes,
    round(min(total_reads)/1e6, 1)                        AS min_reads_m,
    round(max(total_reads)/1e6, 1)                        AS max_reads_m,
    -- coefficient of variation of read counts across lanes
    round(stddev_samp(total_reads) / avg(total_reads), 3) AS reads_cv,
    round(max(dup_pct) - min(dup_pct), 2)                 AS dup_pct_spread,
    round(max(gc_pct)  - min(gc_pct),  2)                 AS gc_pct_spread
FROM per_lane
GROUP BY library_id
HAVING count(*) > 1
ORDER BY reads_cv DESC;
```

**Flag when:** read-count `CV` is high (e.g. `> 0.15`), or duplication / GC spread
across lanes is large. A single lane carrying far fewer reads, or with markedly higher
duplication, points to a lane-specific or library-balancing problem. Compare each
library's spread against the run-wide distribution rather than a hard constant.

---

## Step 4 — Clinical WGS coverage specs

Requirements (clinical WGS only):

| Metric                | Tumor | Normal |
| --------------------- | ----- | ------ |
| Raw coverage          | > 80× | > 40×  |
| Deduplicated coverage | > 50× | > 25×  |

- **Raw coverage** = `depth` from `bclconvert-sample-stats-table` (Q30-yield based
  estimate against the configured genome size).
- **Deduplicated coverage** is not stored directly. Estimate it from the raw
  coverage and the Sequali duplication rate:

  ```
  dedup_coverage ≈ raw_coverage × (1 − mean_lane_dup_pct / 100)
  ```

  This is an approximation (Sequali duplication is read-level, pre-alignment). State
  that assumption when you report. If a definitive dedup coverage exists downstream
  (e.g. an alignment/WGS-QC workflow), prefer that source.

```python
import duckdb

# 1) Raw coverage per library
raw = duckdb.sql("""
    SELECT sample AS library_id,
           max(CASE WHEN metric='depth' THEN val_raw END) AS raw_coverage_x
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='bclconvert-sample-stats-table' AND type='plot_input_row'
    GROUP BY sample
""").df()

# 2) Mean duplication % per library (averaged over its lanes)
dup = duckdb.sql("""
    SELECT regexp_extract(sample, '^(.*)_L[0-9]+$', 1) AS library_id,
           avg(val_raw) AS mean_dup_pct
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='general_stats_table'
      AND metric='sequali_duplication_percentage'
      AND type='plot_input_row'
    GROUP BY 1
""").df()

cov = raw.merge(dup, on="library_id", how="left")
cov["dedup_coverage_x"] = cov["raw_coverage_x"] * (1 - cov["mean_dup_pct"].fillna(0) / 100)

# 3) Join LIMS (clinical WGS only) and apply thresholds
#    lims_df must include: library_id, type, workflow, phenotype
clin = cov.merge(lims_df, on="library_id").query(
    "type == 'WGS' and workflow == 'clinical' and phenotype in ['tumor','normal']"
).copy()

raw_min   = {"tumor": 80, "normal": 40}
dedup_min = {"tumor": 50, "normal": 25}
clin["raw_pass"]   = clin.apply(lambda r: r.raw_coverage_x   >  raw_min[r.phenotype],   axis=1)
clin["dedup_pass"] = clin.apply(lambda r: r.dedup_coverage_x >  dedup_min[r.phenotype], axis=1)

print(clin[["library_id","phenotype","raw_coverage_x","raw_pass",
            "mean_dup_pct","dedup_coverage_x","dedup_pass"]])
```

Report any library where `raw_pass` or `dedup_pass` is `False`, showing the value
against its threshold. On the reference run all clinical WGS tumors sit well above
80× raw (126–156×) and normals above 40× (41–45×).

---

## Step 5 — Undetermined barcodes (excluding poly-G crashout)

Undetermined barcodes live in the `bclconvert_undetermined` bar plot. The per-lane
counts are inside `plot_input_data` (JSON), **not** in `plot_input_row` rows.

- **Poly-G crashout** (`GGGGGGGGGG` in either index) is expected on patterned flow
  cells — no signal is read as G. Ignore these.
- A **high-count undetermined barcode with no poly-G** may be a real library index
  that was mis-specified in the sample sheet (wrong index, off-by-one, or swapped
  i5/i7). These deserve investigation — resolve them to a plate/well and compare
  against the run's libraries (see the index-reference lookup below).

```python
import duckdb, json

blob = duckdb.sql("""
    SELECT plot_input_data
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='bclconvert_undetermined' AND type='plot_input'
    LIMIT 1
""").fetchone()[0]

obj  = json.loads(blob)
data = obj["data"][0]          # dataset 0 = raw counts; missing lanes = "__NAN__MARKER__"
POLYG = "GGGGGGGGGG"

candidates = []
for barcode, lanes in data.items():
    if POLYG in barcode:
        continue                                   # skip index crashout
    total = sum(v for v in lanes.values() if isinstance(v, (int, float)))
    per_lane = {k: v for k, v in lanes.items() if isinstance(v, (int, float))}
    candidates.append((barcode, total, per_lane))

candidates.sort(key=lambda x: -x[1])
for barcode, total, per_lane in candidates[:10]:
    print(f"{barcode:25s} {total:>12,}  {per_lane}")
```

**Assigned indexes on the run.** Get the index sequence for each library from the
`index` metric in `bclconvert-sample-stats-table` (falls back to `lims.truseq_index`):

```sql
-- DuckDB. Index sequence assigned to each library on this run (format "I7-I5").
SELECT sample AS library_id, any_value(val_fmt) AS assigned_index
FROM read_parquet('multiqc.parquet')
WHERE anchor='bclconvert-sample-stats-table' AND metric='index'
GROUP BY sample;
```

### Resolve barcodes to plate / well via the index reference CSV

Look up every barcode (both the undetermined ones and the run's assigned library
indexes) against the public index reference:

```
https://github.com/angelovangel/samplesheet-generator/blob/master/indexdata/indexcsv.csv
raw: https://raw.githubusercontent.com/angelovangel/samplesheet-generator/master/indexdata/indexcsv.csv
```

CSV columns: `Index_Plate`, `Index_Plate_Well`, `I7_Index_ID`, `index` (i7),
`I5_Index_ID`, `index2` (i5), `indexkit`, `set`, `workflow`.

**Two things must be handled or you WILL miss real matches:**

1. **Index length differs.** Reference indexes are 8 bp **or** 10 bp, and the barcode
   read out by BCLConvert may be longer than the reference (e.g. a 10 bp read of an
   8 bp index: `CGGACAAC` in the kit vs `CGGACAACAT` in the barcode). **Never** score
   unequal-length sequences as a full mismatch. Compare over the shared prefix and
   count the extra bases as "length slop", not as Hamming distance.

2. **i5 orientation.** The i7 sequence is identical across workflows, but the i5
   differs: `workflow='miseq'` stores the **forward** i5 and `workflow='nextseq'`
   stores its **reverse-complement**. BCLConvert reports i5 in the sequencer's
   orientation, so for a **NovaSeq 6000 (`A0…`, e.g. `A01052`)** the `nextseq` rows
   are the primary match — but always **also try the reverse-complement of the read
   i5** before giving up. Kits and instrument orientations vary.

Barcodes are `I7-I5` (split on `-`). Match i7 and i5 independently.

```python
import csv, io, json, urllib.request
import duckdb, pandas as pd

CSV_URL = "https://raw.githubusercontent.com/angelovangel/samplesheet-generator/master/indexdata/indexcsv.csv"

def _rc(s):
    return s.translate(str.maketrans("ACGT", "TGCA"))[::-1]

def load_index_ref(orientation="reverse"):
    """orientation: 'reverse' (NovaSeq 6000 / nextseq) or 'forward' (miseq)."""
    wf = "nextseq" if orientation == "reverse" else "miseq"
    raw = urllib.request.urlopen(CSV_URL).read().decode()
    ref = []
    for r in csv.DictReader(io.StringIO(raw)):
        if r["workflow"] != wf:
            continue
        ref.append(dict(kit=r["indexkit"], set=r["set"], plate=r["Index_Plate"],
                        well=r["Index_Plate_Well"], i7_id=r["I7_Index_ID"],
                        i5_id=r["I5_Index_ID"], i7=r["index"], i5=r["index2"]))
    return ref

def _dist(read, ref_seq):
    """Length-tolerant mismatch score: Hamming over the shared prefix.
    (Barcodes are often read longer than the reference index; the trailing
    bases are trimmed/uninformative, so compare only the overlap.)"""
    n = min(len(read), len(ref_seq))
    return sum(a != b for a, b in zip(read[:n], ref_seq[:n]))

def annotate(barcode, ref):
    """Return (i7, i5, best_entry, i7_dist, i5_dist, i5_orientation).
    i5 is scored both as-read and reverse-complemented; the smaller wins."""
    i7, _, i5 = barcode.partition("-")
    best = None
    best_key = (10**9, 10**9)
    for e in ref:
        di7 = _dist(i7, e["i7"])
        di5_fwd = _dist(i5, e["i5"]) if i5 else 0
        di5_rc  = _dist(_rc(i5), e["i5"]) if i5 else 0
        di5, orient = (di5_fwd, "as-read") if di5_fwd <= di5_rc else (di5_rc, "rev-comp")
        key = (di7 + di5, di7)
        if key < best_key:
            best_key, best, best_i5, best_orient = key, e, di5, orient
    return i7, i5, best, _dist(i7, best["i7"]), best_i5, best_orient

ref = load_index_ref("reverse")   # NovaSeq 6000

# assigned_df: library_id, assigned_index   (from the SQL above)
# undet: list of (barcode, total_reads, per_lane_dict)  (from the poly-G filter step)
```

> **Worked example (reference run).** The top non-poly-G undetermined barcode
> `CGGACAACAT-CCTCCGGAGT` looks unmatched under naive equal-length Hamming, but with
> length-tolerant + reverse-complement matching it resolves to **zymo `UDI_40`**
> (`CGGACAAC`/`AATCCGGA`, well `H05`): the i7 is an exact 8 bp prefix match (distance 0) and the i5 matches within 1–2 over the 8 bp overlap. That is the same index
> assigned to library **L2600599** on this run — i.e. these are that library's reads
> that failed to demultiplex cleanly, not an unknown external index.

### Tabulate undetermined barcodes against near-by library indexes

For each high-count non-poly-G undetermined barcode, report its own plate/well plus
the run's libraries whose index is closest to it, tabulating read counts side by side:

Per-library read counts for the assigned indexes come from the `clusters` metric in
`bclconvert-sample-stats-table` (Step 2 — use `MAX(val_raw)` for the library total).
Join them in so the table shows the undetermined read count next to each near-by
library's own read count.

```python
def near_libraries(bc_i7, bc_i5, assigned_df):
    """Rank on-run libraries by length-tolerant i7+i5 distance (i5 tried both ways)."""
    hits = []
    for row in assigned_df.itertuples():
        li7, _, li5 = row.assigned_index.partition("-")
        di5 = min(_dist(bc_i5, li5), _dist(_rc(bc_i5), li5)) if bc_i5 and li5 else 0
        d = _dist(bc_i7, li7) + di5
        hits.append((d, row.library_id, row.assigned_index))
    return sorted(hits)[:5]  # nearest 5

rows = []
for barcode, total_reads, per_lane in undet:            # undetermined (non-poly-G)
    i7, i5, ue, ud_i7, ud_i5, ud_orient = annotate(barcode, ref)
    ud = ud_i7 + ud_i5
    ue_loc = (f"{ue['kit']}/{ue['set']} {ue['plate']}:{ue['well']} ({ue['i7_id']}, i5 {ud_orient})"
              if ud <= 2 else "unmatched")
    for d, lib, lib_index in near_libraries(i7, i5, assigned_df):
        le = annotate(lib_index, ref)[2]
        le_well = f"{le['plate']}:{le['well']}" if le else "unmatched"
        rows.append({
            "undet_barcode":  barcode,
            "undet_reads":    total_reads,
            "undet_kit_well": ue_loc,
            "near_library":   lib,
            "library_index":  lib_index,
            "library_well":   le_well,
            "library_reads":  library_reads.get(lib),   # from Step 2 `clusters`
            "dist_to_lib":    d,
        })

report = pd.DataFrame(rows).sort_values(["undet_reads", "dist_to_lib"],
                                        ascending=[False, True])
print(report.to_string(index=False))
```

where `library_reads` is `{library_id: total_clusters}` built from Step 2:

```python
lib_reads_df = duckdb.sql("""
    SELECT sample AS library_id, max(CASE WHEN metric='clusters' THEN val_raw END) AS clusters
    FROM read_parquet('multiqc.parquet')
    WHERE anchor='bclconvert-sample-stats-table' AND type='plot_input_row'
    GROUP BY sample
""").df()
library_reads = dict(zip(lib_reads_df.library_id, lib_reads_df.clusters))
```

This produces, for each undetermined index: its own kit/plate/well (when it maps to a
known kit), and a ranked list of on-run libraries with the nearest indexes, plus the
read counts for both — making index swaps, off-by-one errors, and plate/well
neighbours easy to spot. Flag any undetermined barcode within distance ≤ 2 of an
assigned library index, or that sits in an adjacent well of the same plate, as a
probable sample-sheet or plate-handling error.

**Keep both i5 orientations — always report which one matched (`i5 as-read` vs
`rev-comp`, from `annotate()`).** The orientation is itself a signal, not just plumbing:
if a barcode matches a kit/library only via the _opposite_ i5 orientation to the rest
of the run, or matches a **different kit** than any library on the run, treat it as a
possible cross-run / cross-kit **contamination** candidate rather than a simple
sample-sheet typo — and call it out as such. Do not collapse the orientation away or
assume a single kit; report the matched kit, well, distance, and orientation for every
hit so a human can judge index-hopping vs contamination vs mis-entry.

> **Do not conclude "unmatched" until you have tried length-tolerant + reverse-complement
> matching.** On the reference run (`260910_A01052_0320_AHTYW5DSXF`) the top non-poly-G
> undetermined barcode `CGGACAACAT-CCTCCGGAGT` (~8.8M reads) _looks_ unmatched under
> naive equal-length Hamming (distance ≥ 9), but is in fact zymo `UDI_40` (well `H05`,
> i7 8 bp exact-prefix, i5 within 1–2 rev-comp) — the index assigned to library
> **L2600599** on this run. The barcode is 10 bp because it was read longer than the
> 8 bp index. Naive matching produced a false "no kit match"; the length-tolerant,
> rev-comp-aware `annotate()` above resolves it correctly.

### The full unknown-barcode list (BCLConvert `Reports/`)

The parquet only carries the **top 40** undetermined barcodes. For a thorough
investigation (e.g. hunting low-frequency contamination), read the **complete**
`Top_Unknown_Barcodes.csv` from the BCLConvert primary output — it holds the top
**1000 per lane**.

**Locate the `Reports/` directory.** It lives under the _primary_ output, keyed by
instrument run ID and the **`bssh-to-aws-s3`** copy portal run id — which is a
_different_ ID from both the QC `portal_run_id` and the `bclconvert` workflow id, and
it has no `output`-table row. Resolve it one of two ways:

```sh
# Simplest: list the primary prefix (usually exactly one subdir).
aws s3 ls "s3://pipeline-prod-cache-503977275616-ap-southeast-2/byob-icav2/production/primary/${INSTRUMENT_RUN_ID}/"
# -> PRE 20260911a2cea346/
```

```sql
-- Or resolve via Athena: the subdir is the bssh-to-aws-s3 workflow's portal_run_id,
-- matched on run date (same YYYYMMDD/YYMMDD rule as Step 0).
SELECT DISTINCT portal_run_id
FROM workflow
WHERE workflow_name = 'bssh-to-aws-s3'
  AND CAST(workflow_start AS date) = DATE '2026-09-11';   -- copy runs ~1 day after seq date
```

> The copy run date can be a day _after_ the sequencing date (the reference run
> sequenced `2026-09-10`, copied `2026-09-11`). Prefer the `aws s3 ls` approach when
> unsure — it needs no date arithmetic.

The `Reports/` directory contains (verified on the reference run):

| File                       | Use                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Top_Unknown_Barcodes.csv` | Full unknown-barcode list: `Lane, index, index2, # Reads, % of Unknown Barcodes, % of All Reads` (1000/lane). |
| `SampleSheet.csv`          | `[BCLConvert_Data]` section = authoritative per-lane `Sample_ID, index, index2` mapping.                      |
| `Index_Hopping_Counts.csv` | Per-sample index-hopping counts (`Lane, SampleID, index, index2, # Reads`).                                   |
| `Demultiplex_Stats.csv`    | Per-sample demux stats.                                                                                       |

```sh
REPORTS="s3://pipeline-prod-cache-503977275616-ap-southeast-2/byob-icav2/production/primary/${INSTRUMENT_RUN_ID}/${BSSH_PORTAL_RUN_ID}/Reports"
aws s3 cp "${REPORTS}/Top_Unknown_Barcodes.csv" ./Top_Unknown_Barcodes.csv
aws s3 cp "${REPORTS}/SampleSheet.csv"          ./SampleSheet.csv
```

**Analyse the full list.** `index`/`index2` are already separate columns here (no
`-` split needed). Aggregate across lanes, drop poly-G, then run the same
length-tolerant + reverse-complement `annotate()` from above:

```python
import duckdb

tub = duckdb.sql("""
    SELECT Lane AS lane, index AS i7, index2 AS i5,
           "# Reads" AS reads, "% of Unknown Barcodes" AS pct_unknown
    FROM read_csv_auto('Top_Unknown_Barcodes.csv')
""").df()

# Exclude poly-G crashout in EITHER index, then sum a barcode across lanes.
tub["is_polyg"] = tub.i7.str.contains("GGGGGGGGGG") | tub.i5.str.contains("GGGGGGGGGG")
agg = (tub[~tub.is_polyg]
       .groupby(["i7", "i5"], as_index=False)
       .agg(total_reads=("reads", "sum"))
       .sort_values("total_reads", ascending=False))

# annotate(f"{i7}-{i5}", ref) resolves each to kit/plate/well + i5 orientation,
# and near_libraries() ranks the on-run libraries — reuse the Step 5 helpers.
```

Because this list runs 1000 deep per lane, it is the right source for **low-level
contamination** hunting: barcodes that match a kit/well only via the opposite i5
orientation, or a _different_ kit than any on-run library, stand out here even at low
read counts. Keep both orientations (per your contamination-detection intent) and
report kit, well, distance, orientation, and per-lane vs summed read counts.

> Verified on the reference run: the full CSV has 4000 rows (1000 × 4 lanes); the top
> non-poly-G barcode is the same `CGGACAACAT-CCTCCGGAGT` (~8.8M reads) → zymo `UDI_40`,
> well `H05`, i5 rev-comp — consistent with the parquet top-40 result, now confirmed
> against the complete list.

---

## Step 6 — Run-level Cluster PF, % Occupied, % ≥ Q30

Per lane/read from `interop-runmetrics-detail-table`. Cluster PF / % Occupied are
`"mean +/- std"` strings in `val_fmt`; parse the leading float. % ≥ Q30 is numeric.

```sql
-- DuckDB. Per lane/read InterOp metrics.
-- Cluster PF / % Occupied / Error are "mean +/- std" strings in val_fmt; take the leading float.
-- Some Error rows are "nan +/- nan", so guard the cast with NULLIF + TRY_CAST.
SELECT
    sample AS lane_read,
    max(CASE WHEN metric='Cluster PF' THEN TRY_CAST(NULLIF(regexp_extract(val_fmt, '^([0-9.]+)', 1), '') AS DOUBLE) END) AS cluster_pf_pct,
    max(CASE WHEN metric='% Occupied' THEN TRY_CAST(NULLIF(regexp_extract(val_fmt, '^([0-9.]+)', 1), '') AS DOUBLE) END) AS pct_occupied,
    max(CASE WHEN metric='%>=Q30'     THEN val_raw END)                                                                  AS pct_q30,
    max(CASE WHEN metric='Error'      THEN TRY_CAST(NULLIF(regexp_extract(val_fmt, '^([0-9.]+)', 1), '') AS DOUBLE) END) AS error_pct
FROM read_parquet('multiqc.parquet')
WHERE anchor='interop-runmetrics-detail-table'
GROUP BY sample
ORDER BY sample;
```

### Interpreting the three metrics (Illumina guidance)

This platform (`A01052`) is a **NovaSeq 6000** with a **patterned** flow cell.

- **% ≥ Q30** — fraction of bases with quality ≥ Q30 (0.1% error). Illumina's NovaSeq
  6000 spec target is **≥ 85%** of bases ≥ Q30 for standard read configurations.
  Flag any read/lane below ~85%; healthy runs typically sit ~88–95%.
  ([NovaSeq 6000 specifications](https://emea.illumina.com/systems/sequencing-platforms/novaseq/specifications.html),
  [Q30 app note](https://www.origin-supportassets.prd-web.illumina.com/content/dam/illumina-marketing/documents/products/appnotes/novaseq-hiseq-q30-app-note-770-2017-010.pdf))
- **Cluster PF (%)** — clusters passing filter. On patterned flow cells, cluster
  density is fixed by the wells, so Illumina recommends **Cluster PF% as the primary
  occupancy/loading indicator**. Healthy values are commonly ~80–90%; a sharp drop,
  or big lane-to-lane variation, suggests over/under-loading or a chemistry issue.
  ([Cluster density guidelines](https://support.illumina.com/bulletins/2016/10/cluster-density-guidelines-for-illumina-sequencing-platforms-.html))
- **% Occupied** — percentage of wells holding at least one cluster. Judge it
  **together with Cluster PF**, not alone: the optimal loading zone is high
  % Occupied **and** high % PF. High occupancy with low PF indicates overloading
  (too many polyclonal/failed wells); low occupancy indicates underloading. Plot
  % Occupied (x) vs % PF (y) to place the run in the loading diagnostic chart.
  ([Plotting % Occupied by % PF](https://support.illumina.com/ko-kr/bulletins/2020/03/plotting---occupied-by---pass-filter-to-optimize-loading-concent.html),
  [Diagnosing suboptimal clustering](https://support-docs.illumina.com/SHARE/ClusterOptimize/Content/SHARE/ClusterOptimize/DiagnosingSuboptimalPatterned.htm))

> Treat the numeric cutoffs above as review triggers, not hard pass/fail gates —
> acceptable ranges vary with application, read length and local lab baselines.
> Prefer comparing a run to the lab's own historical distribution when available.
> _Content was rephrased from Illumina documentation for licensing compliance._

A run-level summary (per read, whole flow cell) is also available:

```sql
SELECT sample AS read, metric, val_raw, val_fmt
FROM read_parquet('multiqc.parquet')
WHERE anchor='interop-runmetrics-summary-table'
  AND metric IN ('%>=Q30','Error Rate','Aligned','Yield')
ORDER BY sample, metric;
```

---

## Reporting Checklist

When you finish an analysis, **write the report to a Markdown file** named:

```
<instrument_run_id>_bclconvert_interop_qc_ai_observation_report.md
```

e.g. `260910_A01052_0320_AHTYW5DSXF_bclconvert_interop_qc_ai_observation_report.md`.
Write it to the current working directory unless the user specifies another location.
Also summarise the key findings in your chat reply, but the file is the primary
deliverable.

The report should be a concise, human-readable Markdown document covering:

1. **Run identity** — instrument run ID, portal run ID, date, workflow version, status.
2. **Composition** — table of projects × assay × type with library counts (Step 1).
3. **Run-level health** — Cluster PF, % Occupied, % ≥ Q30, Error per lane; note any
   read/lane outside guidance and whether it looks like a loading issue (Step 6).
4. **Library outliers** — flagged libraries with group, metric, value vs group median (Step 2).
5. **Between-lane consistency** — multi-lane libraries with high read-count CV or
   duplication/GC spread (Step 3).
6. **Clinical WGS coverage** — pass/fail table vs raw and dedup thresholds, stating
   the dedup approximation (Step 4).
7. **Undetermined barcodes** — top non-poly-G barcodes resolved to index kit/plate/well
   (length-tolerant, both i5 orientations), tabulated against the nearest on-run library
   indexes (with plate/well, distance, orientation and read counts). Flag distance ≤ 2,
   adjacent-well hits, or opposite-orientation / cross-kit matches (possible
   contamination). For a deep pass, use the full `Top_Unknown_Barcodes.csv` from the
   BCLConvert `Reports/` directory, not just the parquet top-40 (Step 5).

Always state which numbers are measured versus estimated, and cite the thresholds you
applied.

```

---

## Sources

- Illumina — [NovaSeq 6000 key specifications and performance parameters](https://emea.illumina.com/systems/sequencing-platforms/novaseq/specifications.html)
- Illumina — [Cluster density guidelines for platforms using patterned flow cells](https://support.illumina.com/bulletins/2016/10/cluster-density-guidelines-for-illumina-sequencing-platforms-.html)
- Illumina — [Plotting % Occupied by % Pass Filter to optimize loading concentration](https://support.illumina.com/ko-kr/bulletins/2020/03/plotting---occupied-by---pass-filter-to-optimize-loading-concent.html)
- Illumina — [Diagnosing suboptimal clustering (patterned flow cells)](https://support-docs.illumina.com/SHARE/ClusterOptimize/Content/SHARE/ClusterOptimize/DiagnosingSuboptimalPatterned.htm)
- Illumina — [Denature and dilute libraries for the NovaSeq 6000](https://support-docs.illumina.com/IN/NovaSeq_DnD/Content/NovaSeq6000/DnD-NV6000.htm)
- Index reference CSV — [angelovangel/samplesheet-generator `indexdata/indexcsv.csv`](https://github.com/angelovangel/samplesheet-generator/blob/master/indexdata/indexcsv.csv)

*Threshold guidance above was rephrased and summarised from the Illumina documentation cited for licensing compliance.*
```
