#!/usr/bin/env python3
"""Derive the ARGO field inventory (data model) for fixture authoring.

donor_centric  -> derived 100% from argo/argo-lectern-schema.json (ICGC-ARGO 1.34),
                  nested per the lectern submitter_*_id foreign-key structure.
file_centric   -> standard ARGO/Overture SONG file+analysis+repository metadata
                  (platform convention, NOT in lectern) PLUS an embedded clinical
                  subset whose field names/types/codelists are taken from lectern.

Output: argo-data-model.md  (the artifact pasted into the authoring prompt).
"""
import json
from collections import OrderedDict

LECT = json.load(open("/Users/mshiell/Desktop/CDD/argo/argo-lectern-schema.json"))
SCHEMAS = {s["name"]: s for s in LECT["schemas"]}

# donor is the root; each child entity nests under the path below (SQON __ form).
SCHEMA_PATH = {
    "donor": "",
    "specimen": "specimens",
    "primary_diagnosis": "primary_diagnoses",
    "treatment": "treatments",
    "chemotherapy": "treatments__chemotherapy",
    "hormone_therapy": "treatments__hormone_therapy",
    "radiation": "treatments__radiation",
    "immunotherapy": "treatments__immunotherapy",
    "surgery": "treatments__surgery",
    "follow_up": "follow_ups",
    "biomarker": "biomarkers",
    "exposure": "exposures",
    "comorbidity": "comorbidities",
    "family_history": "family_history",
}
# sample_registration spans three levels:
REG_LEVEL = {
    "gender": "",                                   # donor-level attribute
    "submitter_specimen_id": "specimens",
    "specimen_tissue_source": "specimens",
    "tumour_normal_designation": "specimens",
    "specimen_type": "specimens",
    "submitter_sample_id": "specimens__samples",
    "sample_type": "specimens__samples",
}
# parent-pointer FKs are implied by nesting -> drop from child nodes (keep at root).
DROP_IN_CHILDREN = {"program_id", "submitter_donor_id"}

TYPE = {"string": "keyword", "integer": "integer", "number": "decimal"}

def fieldinfo(f):
    r = f.get("restrictions") or {}
    t = TYPE[f["valueType"]]
    vals = r.get("codeList")
    rng = r.get("range")
    units = (f.get("meta") or {}).get("units")
    return t, vals, rng, units, bool(r.get("required")), bool((f.get("meta") or {}).get("primaryId"))

# collect (path, name) -> info, deduped
rows = OrderedDict()
def put(path, name, f):
    key = (path, name)
    if key in rows:
        return
    rows[key] = fieldinfo(f)

# donor root
for f in SCHEMAS["donor"]["fields"]:
    put("", f["name"], f)
# sample_registration split across levels
for f in SCHEMAS["sample_registration"]["fields"]:
    if f["name"] in ("program_id", "submitter_donor_id"):
        continue
    put(REG_LEVEL[f["name"]], f["name"], f)
# everything else
for sname, path in SCHEMA_PATH.items():
    if sname == "donor":
        continue
    for f in SCHEMAS[sname]["fields"]:
        if path and f["name"] in DROP_IN_CHILDREN:
            continue
        put(path, f["name"], f)

# ---- render donor_centric markdown ----
PATH_ORDER = ["", "specimens", "specimens__samples", "primary_diagnoses",
              "treatments", "treatments__chemotherapy", "treatments__radiation",
              "treatments__hormone_therapy", "treatments__immunotherapy",
              "treatments__surgery", "follow_ups", "biomarkers", "exposures",
              "comorbidities", "family_history"]
PATH_LABEL = {
    "": "donor (root — shallow)",
    "specimens": "specimens[]  (deep)",
    "specimens__samples": "specimens[].samples[]  (deep)",
    "primary_diagnoses": "primary_diagnoses[]  (deep)",
    "treatments": "treatments[]  (deep)",
    "treatments__chemotherapy": "treatments[].chemotherapy[]  (deep)",
    "treatments__radiation": "treatments[].radiation[]  (deep)",
    "treatments__hormone_therapy": "treatments[].hormone_therapy[]  (deep)",
    "treatments__immunotherapy": "treatments[].immunotherapy[]  (deep)",
    "treatments__surgery": "treatments[].surgery[]  (deep)",
    "follow_ups": "follow_ups[]  (deep)",
    "biomarkers": "biomarkers[]  (deep)",
    "exposures": "exposures[]  (deep)",
    "comorbidities": "comorbidities[]  (deep)",
    "family_history": "family_history[]  (deep)",
}

def vals_cell(t, vals, rng, units):
    if vals:
        return "`" + "`, `".join(vals) + "`"
    if rng:
        lo = rng.get("min", rng.get("exclusiveMin"))
        hi = rng.get("max", rng.get("exclusiveMax"))
        u = f" {units}" if units else ""
        if hi is None:
            return f"≥ {lo}{u}"
        if lo is None:
            return f"≤ {hi}{u}"
        return f"{lo}–{hi}{u}"
    if units:
        return f"({units})"
    return ""

out = []
out.append("# ARGO data model — corrected field inventory (for fixture authoring)\n")
out.append("Derived from `argo/argo-lectern-schema.json` (**ICGC-ARGO Data Dictionary "
           f"{LECT['version']}**). This replaces the Overture demo mapping "
           "(`apps/arranger/docker/elasticsearch/mapping.json`), which is dev scaffolding, "
           "not the ARGO data model.\n")
out.append("**Path conventions:** SQON `fieldName` uses Arranger `__` flattening; "
           "GraphQL `reference_fields` uses dotted nesting. **Types & operators:** "
           "keyword → `in`/`not-in`/`some-not-in`; integer/decimal → "
           "`gt`/`gte`/`lt`/`lte`/`between` (+`in` for enumerable). No `date` or `boolean` "
           "fields exist — ARGO encodes time as integer day-intervals.\n")

out.append("\n## Catalogue A — `donor_centric` (clinical; root = donor)\n")
out.append("Root-level donor fields = `single-shallow`; any field under a nested `[]` entity "
           "= `single-deep`. `submitter_*_id` fields are the per-entity identifiers; parent "
           "foreign keys (`program_id`, `submitter_donor_id`) are represented by nesting and "
           "shown only at the donor root (`program_id` = the ARGO program / study id).\n")

total = 0
for path in PATH_ORDER:
    items = [(n, info) for (p, n), info in rows.items() if p == path]
    if not items:
        continue
    out.append(f"\n### {PATH_LABEL[path]}\n")
    out.append("| field | SQON `__` path | type | allowed values / range |")
    out.append("|---|---|---|---|")
    for name, (t, vals, rng, units, req, pid) in items:
        sqon = (path + "__" + name) if path else name
        tag = t + (" · id" if pid else "")
        out.append(f"| `{name}`{' *' if req else ''} | `{sqon}` | {tag} | {vals_cell(t, vals, rng, units)} |")
        total += 1

out.append(f"\n_donor_centric: {total} queryable fields across {len(PATH_ORDER)} entities. "
           "`*` = required at submission._\n")

# ---- file_centric (ARGO-real): SONG metadata + lectern clinical subset ----
out.append("\n## Catalogue B — `file_centric` (ARGO file repository; root = file)\n")
out.append("SONG/Maestro file+analysis+repository metadata (ARGO platform convention — "
           "**not** in lectern) plus an **embedded clinical subset** whose field names, types "
           "and codelists come from lectern. Corrects the demo mapping: drops the non-ARGO "
           "`donors.vaccinated` and `donors.age`, and makes `analysis.experiment.*` real "
           "queryable keyword leaves (this is where `experimental_strategy` lives — what the "
           "demo mock row wrongly modelled as a bare `experiment` value).\n")
file_centric = [
 ("file metadata (shallow)", [
   ("object_id", "object_id", "keyword · id", "file UUID"),
   ("study_id", "study_id", "keyword", "ARGO program code, e.g. `PACA-CA`, `BRCA-UK`"),
   ("data_type", "data_type", "keyword", "e.g. `Aligned Reads`, `Sequencing Reads`, `Gene Expression`, `SSM`"),
   ("file_type", "file_type", "keyword", "`BAM`, `CRAM`, `VCF`, `FASTQ`, `BAI`, `TBI`, `IDX`"),
   ("file_access", "file_access", "keyword", "`open`, `controlled`"),
   ("data_category", "data_category", "keyword", "e.g. `Sequencing Reads`, `Simple Nucleotide Variation`"),
   ("file.name", "file__name", "keyword", ""),
   ("file.size", "file__size", "long", "bytes"),
   ("file.md5sum", "file__md5sum", "keyword", ""),
   ("file.data_category", "file__data_category", "keyword", ""),
 ]),
 ("analysis (shallow / one-hop)", [
   ("analysis.analysis_id", "analysis__analysis_id", "keyword · id", ""),
   ("analysis.analysis_type", "analysis__analysis_type", "keyword", "`sequencing_experiment`, `sequencing_alignment`, `variant_calling`, `qc_metrics`"),
   ("analysis.analysis_state", "analysis__analysis_state", "keyword", "`PUBLISHED`, `UNPUBLISHED`, `SUPPRESSED`"),
   ("analysis.analysis_version", "analysis__analysis_version", "integer", ""),
   ("analysis.experiment.experimental_strategy", "analysis__experiment__experimental_strategy", "keyword", "`WGS`, `WXS`, `RNA-Seq`, `Bisulfite-Seq`, `ChIP-Seq`, `Targeted-Seq`"),
   ("analysis.experiment.platform", "analysis__experiment__platform", "keyword", "`ILLUMINA`, `NANOPORE`, `PACBIO`, `BGI`"),
   ("analysis.experiment.library_strategy", "analysis__experiment__library_strategy", "keyword", ""),
 ]),
 ("donors[] embedded clinical subset (deep) — names from lectern", [
   ("donors.donor_id", "donors__donor_id", "keyword · id", ""),
   ("donors.submitter_donor_id", "donors__submitter_donor_id", "keyword", ""),
   ("donors.gender", "donors__gender", "keyword", "`Female`, `Male`, `Other`"),
   ("donors.specimens.specimen_id", "donors__specimens__specimen_id", "keyword · id", ""),
   ("donors.specimens.submitter_specimen_id", "donors__specimens__submitter_specimen_id", "keyword", ""),
   ("donors.specimens.specimen_type", "donors__specimens__specimen_type", "keyword", "lectern specimen_type codelist (18 values)"),
   ("donors.specimens.specimen_tissue_source", "donors__specimens__specimen_tissue_source", "keyword", "lectern specimen_tissue_source codelist (26 values)"),
   ("donors.specimens.tumour_normal_designation", "donors__specimens__tumour_normal_designation", "keyword", "`Normal`, `Tumour`"),
   ("donors.specimens.samples.sample_id", "donors__specimens__samples__sample_id", "keyword · id", ""),
   ("donors.specimens.samples.submitter_sample_id", "donors__specimens__samples__submitter_sample_id", "keyword", ""),
   ("donors.specimens.samples.sample_type", "donors__specimens__samples__sample_type", "keyword", "lectern sample_type codelist (8 values)"),
   ("donors.specimens.samples.matched_normal_submitter_sample_id", "donors__specimens__samples__matched_normal_submitter_sample_id", "keyword", "SONG-level; flat ref, not a join"),
 ]),
 ("repositories[] (deep / one-hop)", [
   ("repositories.code", "repositories__code", "keyword", "e.g. `collab`, `aws-virginia`"),
   ("repositories.country", "repositories__country", "keyword", ""),
   ("repositories.name", "repositories__name", "keyword", ""),
   ("repositories.organization", "repositories__organization", "keyword", ""),
   ("repositories.url", "repositories__url", "keyword", ""),
 ]),
]
for label, items in file_centric:
    out.append(f"\n### {label}\n")
    out.append("| field (dotted) | SQON `__` path | type | allowed values / notes |")
    out.append("|---|---|---|---|")
    for dotted, sqon, t, note in items:
        out.append(f"| `{dotted}` | `{sqon}` | {t} | {note} |")

out.append("\n_file_centric clinical subset uses lectern field names; the full lectern "
           "codelists for `specimen_type` / `specimen_tissue_source` / `sample_type` apply "
           "(see Catalogue A). Genuinely-absent things — treatment, primary diagnosis, "
           "tumour grade, vital status — remain valid `nonexistent-field` negatives in "
           "file_centric but are **feasible** in donor_centric._\n")

open("/Users/mshiell/Desktop/CDD/Aim1/D-Model-Selection/fixtures/argo-data-model.md", "w").write("\n".join(out))
print(f"donor_centric queryable fields: {total}")
print("wrote argo-data-model.md")
