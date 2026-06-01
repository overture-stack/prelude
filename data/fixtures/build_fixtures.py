#!/usr/bin/env python3
"""Generate fixtures.jsonl + fixtures.csv for the ARGO NL->SQON eval batch.

Legal fields/types/values come from argo-data-model.md (derived from the lectern
dictionary argo/argo-lectern-schema.json for donor_centric, plus ARGO SONG
metadata + lectern-named clinical subset for file_centric). Fixtures are split
across the two ARGO catalogues. reference_ast is derived from reference_sqon by
the canonicaliser (V5 §8: flatten same-op groups, sort+dedup commutative operands
by (fieldName, op, value), sort+dedup set-operator value arrays).
"""
import csv
import json
from collections import OrderedDict, Counter

COMMON = dict(
    source="synthetic-fixture",
    corpus="main",
    fixture_set_version="5.0.0",
    introspection_commit="a1b2c3d4",      # placeholder: repin to the real D07 snapshot hash
    index_commit="snap-2026-05-29",        # placeholder: repin at validation time
    author="MS",
    date_authored="2026-05-30",
)

def L(field, op, value):
    return {"op": op, "content": {"fieldName": field, "value": value}}

def G(op, *children):
    return {"op": op, "content": list(children)}

def _key(node):
    c = node["content"]
    if isinstance(c, list):
        return ("", node["op"], json.dumps(c, sort_keys=True, ensure_ascii=False))
    return (str(c.get("fieldName", "")), node["op"],
            json.dumps(c.get("value"), sort_keys=True, ensure_ascii=False))

def canon(node):
    op = node["op"]
    if op in ("and", "or"):
        kids = []
        for c in node["content"]:
            cc = canon(c)
            if cc["op"] == op:
                kids.extend(cc["content"])
            else:
                kids.append(cc)
        uniq, seen = [], set()
        for c in kids:
            k = json.dumps(c, sort_keys=True, ensure_ascii=False)
            if k not in seen:
                seen.add(k); uniq.append(c)
        uniq.sort(key=_key)
        return {"op": op, "content": uniq}
    if op == "not":
        kids = [canon(c) for c in node["content"]]
        kids.sort(key=_key)
        return {"op": op, "content": kids}
    c = dict(node["content"])
    v = c.get("value")
    if isinstance(v, list) and all(isinstance(x, str) for x in v):
        c["value"] = sorted(dict.fromkeys(v))
    return {"op": op, "content": c}

FIX = []
def add(id, cat, fc, reach, prompt, sqon=None, fields=None, agg=None,
        feasible=True, negative_reason=None, notes=""):
    o = OrderedDict()
    o["id"] = id
    o["source"] = COMMON["source"]; o["corpus"] = COMMON["corpus"]
    o["fixture_set_version"] = COMMON["fixture_set_version"]
    o["introspection_commit"] = COMMON["introspection_commit"]
    o["index_commit"] = COMMON["index_commit"]
    o["author"] = COMMON["author"]; o["date_authored"] = COMMON["date_authored"]
    o["filter_complexity"] = fc; o["schema_reach"] = reach
    o["requires_aggregation"] = agg is not None
    o["feasible"] = feasible
    o["catalogues"] = [cat]
    o["negative_reason"] = negative_reason
    o["prompt"] = prompt
    o["reference_sqon"] = sqon
    o["reference_ast"] = canon(sqon) if sqon is not None else None
    o["reference_fields"] = fields
    o["reference_aggregation"] = agg
    o["expected_record_ids"] = []
    o["reference_validated"] = "pending"; o["frontier_pass"] = "pending"
    o["frontier_model"] = None; o["validation_date"] = None
    o["notes"] = notes
    FIX.append(o)

D = "donor_centric"; F = "file_centric"
GB = 1073741824
SONG = "ARGO SONG/file metadata value (platform convention, not lectern); confirm against the real file index at validation."

# === SINGLE-PREDICATE / SHALLOW (8) — 4 donor, 4 file ======================
add("single-pred-shallow-001", D, "single-predicate", "single-shallow",
    "Show me all the deceased donors.",
    L("vital_status", "in", ["Deceased"]),
    ["submitter_donor_id", "vital_status"])
add("single-pred-shallow-002", D, "single-predicate", "single-shallow",
    "Find donors whose primary site is the pancreas.",
    L("primary_site", "in", ["Pancreas"]),
    ["submitter_donor_id", "primary_site"])
add("single-pred-shallow-003", D, "single-predicate", "single-shallow",
    "Among female donors, give me a breakdown by primary site.",
    L("gender", "in", ["Female"]),
    ["submitter_donor_id", "gender", "primary_site"],
    agg={"field": "primary_site", "aggType": "terms", "args": {}})
add("single-pred-shallow-004", D, "single-predicate", "single-shallow",
    "Which donors survived more than five years past diagnosis?",
    L("survival_time", "gt", 1825),
    ["submitter_donor_id", "survival_time"],
    notes="survival_time is an integer day-interval; 5 years taken as 1825 days.")
add("single-pred-shallow-005", F, "single-predicate", "single-shallow",
    "Find every BAM file in the catalogue.",
    L("file_type", "in", ["BAM"]),
    ["object_id", "file_type"], notes=SONG)
add("single-pred-shallow-006", F, "single-predicate", "single-shallow",
    "Show me the open-access files.",
    L("file_access", "in", ["open"]),
    ["object_id", "file_access"], notes=SONG)
add("single-pred-shallow-007", F, "single-predicate", "single-shallow",
    "List the files that belong to the PACA-CA study.",
    L("study_id", "in", ["PACA-CA"]),
    ["object_id", "study_id"], notes="study_id = ICGC program code; "+SONG)
add("single-pred-shallow-008", F, "single-predicate", "single-shallow",
    "Across published analyses, how many distinct studies are represented?",
    L("analysis__analysis_state", "in", ["PUBLISHED"]),
    ["study_id", "analysis.analysis_state"],
    agg={"field": "study_id", "aggType": "cardinality", "args": {}}, notes=SONG)

# === SINGLE-PREDICATE / DEEP (4) — 2 donor, 2 file =========================
add("single-pred-deep-001", D, "single-predicate", "single-deep",
    "Show me donors who have a Total RNA sample.",
    L("specimens__samples__sample_type", "in", ["Total RNA"]),
    ["submitter_donor_id", "specimens.samples.sample_type"])
add("single-pred-deep-002", D, "single-predicate", "single-deep",
    "For donors who had chemotherapy, break their treatments down by intent.",
    L("treatments__treatment_type", "in", ["Chemotherapy"]),
    ["submitter_donor_id", "treatments.treatment_type", "treatments.treatment_intent"],
    agg={"field": "treatments__treatment_intent", "aggType": "terms", "args": {}})
add("single-pred-deep-003", F, "single-predicate", "single-deep",
    "Files that came from RNA-Seq experiments.",
    L("analysis__experiment__experimental_strategy", "in", ["RNA-Seq"]),
    ["object_id", "analysis.experiment.experimental_strategy"], notes=SONG)
add("single-pred-deep-004", F, "single-predicate", "single-deep",
    "Find files that include a primary tumour specimen.",
    L("donors__specimens__specimen_type", "in", ["Primary tumour"]),
    ["object_id", "donors.specimens.specimen_type"],
    notes="'Primary tumour' is the exact base specimen_type codeList value.")

# === BOOLEAN / SHALLOW (8) — 4 donor, 4 file ===============================
add("boolean-shallow-001", D, "boolean", "single-shallow",
    "Deceased donors who died of their cancer.",
    G("and", L("vital_status", "in", ["Deceased"]), L("cause_of_death", "in", ["Died of cancer"])),
    ["submitter_donor_id", "vital_status", "cause_of_death"])
add("boolean-shallow-002", D, "boolean", "single-shallow",
    "Female donors with a breast primary site.",
    G("and", L("gender", "in", ["Female"]), L("primary_site", "in", ["Breast"])),
    ["submitter_donor_id", "gender", "primary_site"])
add("boolean-shallow-003", D, "boolean", "single-shallow",
    "Donors who either have a breast primary or carry hereditary breast and ovarian cancer syndrome.",
    G("or", L("primary_site", "in", ["Breast"]),
      L("genetic_disorders", "in", ["Hereditary Breast and Ovarian Cancer Syndrome (HBOC)"])),
    ["submitter_donor_id", "primary_site", "genetic_disorders"])
add("boolean-shallow-004", D, "boolean", "single-shallow",
    "Among female donors who are deceased, break the cohort down by primary site.",
    G("and", L("gender", "in", ["Female"]), L("vital_status", "in", ["Deceased"])),
    ["submitter_donor_id", "gender", "vital_status", "primary_site"],
    agg={"field": "primary_site", "aggType": "terms", "args": {}})
add("boolean-shallow-005", F, "boolean", "single-shallow",
    "Find open-access BAM files.",
    G("and", L("file_access", "in", ["open"]), L("file_type", "in", ["BAM"])),
    ["object_id", "file_access", "file_type"], notes=SONG)
add("boolean-shallow-006", F, "boolean", "single-shallow",
    "Controlled-access VCF files from the LIRI-JP study.",
    G("and", L("file_access", "in", ["controlled"]), L("file_type", "in", ["VCF"]),
      L("study_id", "in", ["LIRI-JP"])),
    ["object_id", "file_access", "file_type", "study_id"], notes=SONG)
add("boolean-shallow-007", F, "boolean", "single-shallow",
    "Files that are either CRAM format or come from the RECA-EU study.",
    G("or", L("file_type", "in", ["CRAM"]), L("study_id", "in", ["RECA-EU"])),
    ["object_id", "file_type", "study_id"], notes=SONG)
add("boolean-shallow-008", F, "boolean", "single-shallow",
    "For published sequencing-alignment analyses, break the files down by data type.",
    G("and", L("analysis__analysis_state", "in", ["PUBLISHED"]),
      L("analysis__analysis_type", "in", ["sequencing_alignment"])),
    ["object_id", "analysis.analysis_state", "analysis.analysis_type", "data_type"],
    agg={"field": "data_type", "aggType": "terms", "args": {}}, notes=SONG)

# === BOOLEAN / DEEP (5) — 3 donor, 2 file ==================================
add("boolean-deep-001", D, "boolean", "single-deep",
    "Donors with a Total DNA sample taken from a primary tumour specimen.",
    G("and", L("specimens__specimen_type", "in", ["Primary tumour"]),
      L("specimens__samples__sample_type", "in", ["Total DNA"])),
    ["submitter_donor_id", "specimens.specimen_type", "specimens.samples.sample_type"])
add("boolean-deep-002", D, "boolean", "single-deep",
    "Donors with ER-positive, HER2-negative tumours.",
    G("and", L("biomarkers__er_status", "in", ["Positive"]),
      L("biomarkers__her2_ihc_status", "in", ["Negative"])),
    ["submitter_donor_id", "biomarkers.er_status", "biomarkers.her2_ihc_status"],
    notes="HER2 status read from the IHC field (her2_ihc_status); ish field left aside.")
add("boolean-deep-003", D, "boolean", "single-deep",
    "For donors who had curative-intent radiation therapy, break the treatments down by the anatomical site irradiated.",
    G("and", L("treatments__treatment_type", "in", ["Radiation therapy"]),
      L("treatments__treatment_intent", "in", ["Curative"])),
    ["submitter_donor_id", "treatments.treatment_type", "treatments.treatment_intent",
     "treatments.radiation.anatomical_site_irradiated"],
    agg={"field": "treatments__radiation__anatomical_site_irradiated", "aggType": "terms", "args": {}})
add("boolean-deep-004", F, "boolean", "single-deep",
    "Files with a Total RNA sample from a tumour specimen.",
    G("and", L("donors__specimens__samples__sample_type", "in", ["Total RNA"]),
      L("donors__specimens__tumour_normal_designation", "in", ["Tumour"])),
    ["object_id", "donors.specimens.samples.sample_type", "donors.specimens.tumour_normal_designation"])
add("boolean-deep-005", F, "boolean", "single-deep",
    "Whole-genome sequencing files run on an Illumina platform.",
    G("and", L("analysis__experiment__experimental_strategy", "in", ["WGS"]),
      L("analysis__experiment__platform", "in", ["ILLUMINA"])),
    ["object_id", "analysis.experiment.experimental_strategy", "analysis.experiment.platform"],
    notes=SONG)

# === NEGATION / SHALLOW (6) — 3 donor, 3 file ==============================
add("negation-shallow-001", D, "negation", "single-shallow",
    "Donors who did not die of their cancer.",
    L("cause_of_death", "not-in", ["Died of cancer"]),
    ["submitter_donor_id", "cause_of_death"],
    notes="cause_of_death codeList is {Died of cancer, Died of other reasons, Unknown}; not a binary flip.")
add("negation-shallow-002", D, "negation", "single-shallow",
    "Donors whose primary site is neither breast nor ovary.",
    L("primary_site", "not-in", ["Breast", "Ovary"]),
    ["submitter_donor_id", "primary_site"])
add("negation-shallow-003", D, "negation", "single-shallow",
    "Leaving out donors of unknown cause of death, break them down by cause of death.",
    L("cause_of_death", "not-in", ["Unknown"]),
    ["submitter_donor_id", "cause_of_death"],
    agg={"field": "cause_of_death", "aggType": "terms", "args": {}})
add("negation-shallow-004", F, "negation", "single-shallow",
    "Find files that aren't controlled-access.",
    L("file_access", "not-in", ["controlled"]),
    ["object_id", "file_access"], notes=SONG)
add("negation-shallow-005", F, "negation", "single-shallow",
    "Files that are neither BAM nor CRAM.",
    L("file_type", "not-in", ["BAM", "CRAM"]),
    ["object_id", "file_type"], notes=SONG)
add("negation-shallow-006", F, "negation", "single-shallow",
    "Files that are not open-access FASTQ files.",
    G("not", G("and", L("file_access", "in", ["open"]), L("file_type", "in", ["FASTQ"]))),
    ["object_id", "file_access", "file_type"],
    notes="Excludes files that are BOTH open-access AND FASTQ: NOT(open AND FASTQ). "+SONG)

# === NEGATION / DEEP (5) — 3 donor, 2 file =================================
add("negation-deep-001", D, "negation", "single-deep",
    "Donors whose samples are not Total DNA.",
    L("specimens__samples__sample_type", "not-in", ["Total DNA"]),
    ["submitter_donor_id", "specimens.samples.sample_type"])
add("negation-deep-002", D, "negation", "single-deep",
    "Donors with at least one specimen that isn't a primary tumour.",
    L("specimens__specimen_type", "some-not-in", ["Primary tumour"]),
    ["submitter_donor_id", "specimens.specimen_type"],
    notes="some-not-in: the nested specimens array has at least one element outside the value set.")
add("negation-deep-003", D, "negation", "single-deep",
    "How many distinct donors never received chemotherapy?",
    L("treatments__treatment_type", "not-in", ["Chemotherapy"]),
    ["submitter_donor_id", "treatments.treatment_type"],
    agg={"field": "submitter_donor_id", "aggType": "cardinality", "args": {}})
add("negation-deep-004", F, "negation", "single-deep",
    "For files whose experiment isn't RNA-Seq, break them down by experimental strategy.",
    L("analysis__experiment__experimental_strategy", "not-in", ["RNA-Seq"]),
    ["object_id", "analysis.experiment.experimental_strategy"],
    agg={"field": "analysis__experiment__experimental_strategy", "aggType": "terms", "args": {}},
    notes=SONG)
add("negation-deep-005", F, "negation", "single-deep",
    "Files that include at least one sample that isn't Total RNA.",
    L("donors__specimens__samples__sample_type", "some-not-in", ["Total RNA"]),
    ["object_id", "donors.specimens.samples.sample_type"],
    notes="some-not-in over the embedded nested samples array.")

# === NEGATIVES / INFEASIBLE (8) ============================================
add("negative-001", F, "single-predicate", "single-deep",
    "Show me files from donors who are deceased.",
    feasible=False, negative_reason="nonexistent-field",
    notes="file_centric embeds only donor_id/submitter_donor_id/gender on the donor; vital_status is a donor_centric (lectern) field, absent here.")
add("negative-002", F, "boolean", "single-deep",
    "BAM files from donors who were treated with FOLFIRINOX chemotherapy.",
    feasible=False, negative_reason="nonexistent-field",
    notes="file_type=BAM is valid, but file_centric has no treatment/chemotherapy entity; the chemo condition is not expressible in this catalogue.")
add("negative-003", F, "single-predicate", "single-deep",
    "Files where the specimen's tumour grade is G3.",
    feasible=False, negative_reason="nonexistent-field",
    notes="file_centric's embedded specimen subset has no tumour_grade (that field lives on donor_centric specimens).")
add("negative-004", D, "single-predicate", "single-shallow",
    "Donors whose files are larger than 1 GB.",
    feasible=False, negative_reason="nonexistent-field",
    notes="file.size is a file_centric field; donor_centric is clinical-only and has no file/size metadata.")
add("negative-005", D, "single-predicate", "single-shallow",
    "Donors whose vital status is 'Critical'.",
    feasible=False, negative_reason="nonexistent-value",
    notes="vital_status exists but its codeList is {Alive, Deceased}; 'Critical' is not a legal value.")
add("negative-006", D, "single-predicate", "single-deep",
    "Donors with a miRNA sample.",
    feasible=False, negative_reason="nonexistent-value",
    notes="sample_type exists but its codeList has no miRNA entry (Total/Amplified DNA, ctDNA, Other DNA enrichments, Total RNA, polyA+ RNA, Ribo-Zero RNA, Other RNA fractions).")
add("negative-007", F, "single-predicate", "single-shallow",
    "Show me all the embargoed files.",
    feasible=False, negative_reason="nonexistent-value",
    notes="file_access exists but its values are {open, controlled}; 'embargoed' is not a legal value.")
add("negative-008", F, "boolean", "single-deep",
    "Pair each tumour file with the matched normal file from the same donor and return both.",
    feasible=False, negative_reason="nonexistent-relationship",
    notes="matched_normal_submitter_sample_id is a flat string field, not a resolvable join; no tumour<->normal file pairing relationship exists to traverse.")

# ---- write JSONL ----
with open("fixtures.jsonl", "w", encoding="utf-8") as fh:
    for o in FIX:
        fh.write(json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n")

# ---- write CSV ----
COLS = ["id", "source", "corpus", "fixture_set_version", "introspection_commit",
        "index_commit", "author", "date_authored", "filter_complexity", "schema_reach",
        "requires_aggregation", "feasible", "catalogues", "negative_reason", "prompt",
        "reference_sqon", "reference_ast", "reference_fields", "reference_aggregation",
        "expected_record_ids", "reference_validated", "frontier_pass", "frontier_model",
        "validation_date", "notes"]
BOOL_YN = {"requires_aggregation", "feasible"}
JSON_COLS = {"catalogues", "reference_sqon", "reference_ast", "reference_fields",
             "reference_aggregation", "expected_record_ids"}
def cell(col, val):
    if val is None: return ""
    if col in BOOL_YN: return "yes" if val else "no"
    if col in JSON_COLS: return json.dumps(val, ensure_ascii=False, separators=(",", ":"))
    return str(val)
with open("fixtures.csv", "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
    w.writerow(COLS)
    for o in FIX:
        w.writerow([cell(c, o.get(c)) for c in COLS])

# ---- summary + invariants ----
feas = [o for o in FIX if o["feasible"]]
print(f"total={len(FIX)} feasible={len(feas)} negative={len(FIX)-len(feas)}")
print("grid:", dict(Counter((o["filter_complexity"], o["schema_reach"]) for o in feas)))
print("aggs:", sum(o["requires_aggregation"] for o in FIX),
      "by fc:", dict(Counter(o["filter_complexity"] for o in FIX if o["requires_aggregation"])))
print("catalogue (feasible):", dict(Counter(o["catalogues"][0] for o in feas)))
print("catalogue (all):", dict(Counter(o["catalogues"][0] for o in FIX)))
print("neg reasons:", dict(Counter(o["negative_reason"] for o in FIX if not o["feasible"])))
ids = [o["id"] for o in FIX]
assert len(ids) == len(set(ids)), "duplicate ids!"
print("ids unique:", len(ids))
