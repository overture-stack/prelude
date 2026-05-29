#!/bin/bash
# /setup/scripts/services/elasticsearch/index_discovery.sh
#
# Shared helper: discovers the Elasticsearch indices a deployment expects by
# scanning the mapping files in the config directory, following the project-wide
# "<name>" naming convention. Sourced by both setup_indices.sh (provisioning)
# and elasticsearch_index_check.sh (verification) so the two can never drift.
#
# Convention, given a mapping file "<name>-mapping.json":
#   index name    = <name>-index
#   template name = <name>-index
#   alias name    = <name>_centric
#   template file = the mapping file itself
#
# discover_indices <config_dir> emits one pipe-delimited line per index:
#   <index_name>|<template_name>|<alias_name>|<template_file>
discover_indices() {
    config_dir="$1"

    for mapping_file in "$config_dir"/*-mapping.json; do
        # When the glob matches nothing it stays literal; skip that case.
        [ -f "$mapping_file" ] || continue

        base=$(basename "$mapping_file")
        name=${base%-mapping.json}

        printf '%s|%s|%s|%s\n' "${name}-index" "${name}-index" "${name}_centric" "$mapping_file"
    done
}
