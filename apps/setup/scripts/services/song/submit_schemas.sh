#!/bin/sh
# submit_schemas.sh
# Registers all JSON schema files found in configs/songConfigs/ with Song.
# Idempotent: a 409 Conflict response means the schema already exists and is treated as success.

SCHEMA_DIR="${SONG_SCHEMA_DIR:-configs/songConfigs}"

schema_files=$(ls "${SCHEMA_DIR}"/*.json 2>/dev/null)

if [ -z "$schema_files" ]; then
    printf "\033[1;33mWarning:\033[0m No schema files found in %s — skipping\n" "$SCHEMA_DIR"
    exit 0
fi

for schema_file in "${SCHEMA_DIR}"/*.json; do
    schema_name=$(basename "$schema_file" .json)
    printf "\033[1;36mSetup:\033[0m Registering schema '%s'\n" "$schema_name"

    HTTP_CODE=$(curl -s -o /tmp/song_schema_response.json -w "%{http_code}" \
        -X POST \
        "${SONG_URL}/schemas" \
        -H "accept: */*" \
        -H "Content-Type: application/json" \
        -d @"${schema_file}")

    case "$HTTP_CODE" in
        200|201)
            printf "\033[1;32mSuccess:\033[0m Schema '%s' registered\n" "$schema_name"
            ;;
        409)
            printf "\033[1;36mInfo:\033[0m Schema '%s' already exists\n" "$schema_name"
            ;;
        *)
            printf "\033[1;31mError:\033[0m Unexpected response %s registering schema '%s'\n" \
                "$HTTP_CODE" "$schema_name"
            cat /tmp/song_schema_response.json 2>/dev/null
            printf "\n"
            exit 1
            ;;
    esac
done
