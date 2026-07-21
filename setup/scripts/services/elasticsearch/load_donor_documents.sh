#!/bin/bash

# Bulk-load the ARGO clinical data into donor-index.
#
# ARGO clinical data is a single donor-centric index of nested documents, prebuilt as
# data/tables/argo_clinical/donor.ndjson (donor with nested specimen/diagnosis/treatment/
# therapy/follow-up/biomarker entities). Conductor's flat-CSV upload cannot express that
# 15-entity join, so it is loaded here, in the setup container (which has curl), right
# after setup_indices.sh creates donor-index from configs/opensearch/donor-mapping.json.
#
# No-ops cleanly if the artifact is absent, so the demo still comes up without ARGO data.

ES_URL="${ES_URL:-http://opensearch:9200}"
NDJSON="/data/tables/argo_clinical/donor.ndjson"
INDEX="donor-index"

if [ ! -f "$NDJSON" ]; then
    printf "   └─ \033[1;33mSkip:\033[0m %s not found; %s left empty\n" "$NDJSON" "$INDEX"
    exit 0
fi

# donor-index must already exist (setup_indices.sh creates it from the mapping template).
if ! curl -s -f -u "$ES_USER:$ES_PASS" "$ES_URL/$INDEX" > /dev/null 2>&1; then
    printf "   └─ \033[1;31mError:\033[0m %s does not exist; setup_indices.sh must run first\n" "$INDEX"
    exit 1
fi

printf "   └─ \033[1;36mElasticsearch:\033[0m Bulk-loading ARGO clinical docs into %s\n" "$INDEX"
resp=$(curl -s -u "$ES_USER:$ES_PASS" -H "Content-Type: application/x-ndjson" \
    -X POST "$ES_URL/$INDEX/_bulk" --data-binary @"$NDJSON")

# _bulk returns HTTP 200 even when individual items fail, so inspect the errors flag.
if printf '%s' "$resp" | grep -q '"errors":true'; then
    printf "   └─ \033[1;31mError:\033[0m %s bulk load reported item errors\n" "$INDEX"
    exit 1
fi

curl -s -u "$ES_USER:$ES_PASS" -X POST "$ES_URL/$INDEX/_refresh" > /dev/null
count=$(curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/$INDEX/_count" | grep -o '"count":[0-9]*' | cut -d: -f2)
printf "   └─ \033[1;32mSuccess:\033[0m %s loaded (%s docs)\n" "$INDEX" "$count"
