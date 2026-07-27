#!/bin/sh
# submit_analyses.sh
# Full curl-based data submission pipeline. Runs inside an alpine/curl container
# on platform-network so internal service hostnames are reachable.
#
# Flow per payload:
#   1. POST /submit/{studyId}                   — register analysis metadata with Song
#   2. GET  /studies/{studyId}/analysis/{id}    — fetch objectIds + filenames from Song
#   3. For each file, 4-step Score upload:
#        a. POST /upload/{objectId}/uploads     — initiate, get uploadId + presigned URL
#        b. PUT  {presignedUrl}                 — write bytes directly to MinIO
#        c. POST /upload/{objectId}/parts       — register part + ETag with Score
#        d. POST /upload/{objectId}             — finalize upload
#   4. PUT  /studies/{studyId}/analysis/publish/{id}  — publish (triggers Kafka → Maestro)

set -e

apk add --quiet --no-progress jq 2>/dev/null

SONG_URL="${SONG_URL:-http://song:8080}"
SCORE_URL="${SCORE_URL:-http://score:8087}"
ACCESS_TOKEN="${SCORE_ACCESS_TOKEN:-68fb42b4-f1ed-4e8c-beab-3724b99fe528}"
STUDY_ID="${SONG_STUDY_ID:-demo}"
PAYLOAD_DIR="${SONG_PAYLOAD_DIR:-/data/payloads}"
FILES_DIR="${SONG_FILES_DIR:-/data/files}"

AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"

payload_count=$(ls "${PAYLOAD_DIR}"/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$payload_count" -eq 0 ]; then
    printf "\033[1;33mWarning:\033[0m No payload files found in %s — skipping\n" "$PAYLOAD_DIR"
    exit 0
fi

printf "\033[1;36mSubmit:\033[0m Submitting %s analysis payload(s)\n" "$payload_count"

for payload in "${PAYLOAD_DIR}"/*.json; do
    participant=$(basename "$payload" .json)
    printf "\n\033[1;35m──\033[0m Processing '\033[1m%s\033[0m'\n" "$participant"

    # ── Step 1: Submit analysis metadata to Song ──────────────────────────────
    # Patch the payload with real fileSize and fileMd5sum before submitting so
    # Song's publish-time size/MD5 validation matches what Score actually stores.
    printf "   \033[1;36mSong:\033[0m Submitting analysis\n"
    patched=$(cat "$payload")
    file_count_payload=$(printf '%s' "$patched" | jq '.files | length')
    k=0
    while [ "$k" -lt "$file_count_payload" ]; do
        fname=$(printf '%s' "$patched" | jq -r ".files[$k].fileName")
        fpath="${FILES_DIR}/${fname}"
        if [ -f "$fpath" ]; then
            actual_size=$(wc -c < "$fpath" | tr -d ' ')
            actual_md5=$(md5sum "$fpath" | cut -d' ' -f1)
            patched=$(printf '%s' "$patched" | jq \
                ".files[$k].fileSize = $actual_size | .files[$k].fileMd5sum = \"$actual_md5\"")
        fi
        k=$((k + 1))
    done

    submit_response=$(printf '%s' "$patched" | curl -s -X POST "${SONG_URL}/submit/${STUDY_ID}" \
        -H "${AUTH_HEADER}" \
        -H "Content-Type: application/json" \
        --data-binary @-)

    analysis_id=$(printf '%s' "$submit_response" | jq -r '.analysisId // empty')
    if [ -z "$analysis_id" ]; then
        http_status=$(printf '%s' "$submit_response" | jq -r '.httpStatusCode // empty')
        error_id=$(printf '%s' "$submit_response" | jq -r '.errorId // empty')

        if [ "$http_status" = "409" ] || [ "$error_id" = "info.already.exists" ]; then
            # Analysis already exists — look it up and decide how to proceed
            first_file=$(printf '%s' "$patched" | jq -r '.files[0].fileName')
            all_analyses=$(curl -s "${SONG_URL}/studies/${STUDY_ID}/analysis?analysisStates=PUBLISHED,UNPUBLISHED,SUPPRESSED" \
                -H "${AUTH_HEADER}")

            existing_state=$(printf '%s' "$all_analyses" | jq -r --arg f "$first_file" \
                '[.[] | select(.files[] | .fileName == $f)] | .[0].analysisState // empty')
            analysis_id=$(printf '%s' "$all_analyses" | jq -r --arg f "$first_file" \
                '[.[] | select(.files[] | .fileName == $f)] | .[0].analysisId // empty')

            if [ -z "$analysis_id" ]; then
                printf "   \033[1;31mError:\033[0m Song conflict but no matching analysis found — %s\n" "$submit_response" >&2
                exit 1
            fi

            if [ "$existing_state" = "PUBLISHED" ]; then
                printf "   \033[1;32mAlready published\033[0m — skipping '%s'\n" "$participant"
                continue
            elif [ "$existing_state" = "UNPUBLISHED" ]; then
                printf "   \033[1;33mWarning:\033[0m Resuming UNPUBLISHED analysis %s\n" "$analysis_id"
            else
                printf "   \033[1;31mError:\033[0m Analysis is %s (ID: %s)\n" "$existing_state" "$analysis_id" >&2
                printf "   Run: make reset-song  to clear the Song database and resubmit\n" >&2
                exit 1
            fi
        else
            printf "   \033[1;31mError:\033[0m Song submission failed — %s\n" "$submit_response" >&2
            exit 1
        fi
    fi
    printf "   \033[1;32mSuccess:\033[0m Analysis ID: %s\n" "$analysis_id"

    # ── Step 2: Fetch full analysis to get objectIds and filenames ────────────
    analysis=$(curl -s "${SONG_URL}/studies/${STUDY_ID}/analysis/${analysis_id}" \
        -H "${AUTH_HEADER}")

    file_count=$(printf '%s' "$analysis" | jq '.files | length')
    printf "   \033[1;36mScore:\033[0m Uploading %s file(s)\n" "$file_count"

    # ── Step 3: Upload each file to Score / MinIO ─────────────────────────────
    i=0
    while [ "$i" -lt "$file_count" ]; do
        object_id=$(printf '%s' "$analysis" | jq -r ".files[$i].objectId")
        file_name=$(printf '%s' "$analysis" | jq -r ".files[$i].fileName")
        file_path="${FILES_DIR}/${file_name}"

        if [ ! -f "$file_path" ]; then
            printf "   \033[1;31mError:\033[0m File not found: %s\n" "$file_path" >&2
            exit 1
        fi

        file_size=$(wc -c < "$file_path" | tr -d ' ')
        file_md5=$(md5sum "$file_path" | cut -d' ' -f1)
        printf "      \033[1;36m→\033[0m %s (%s bytes)\n" "$file_name" "$file_size"

        # 3a — initiate upload: Score registers the upload, returns uploadId + presigned URL
        initiate_response=$(curl -s -X POST \
            "${SCORE_URL}/upload/${object_id}/uploads?fileSize=${file_size}&md5=${file_md5}&overwrite=true" \
            -H "${AUTH_HEADER}")

        upload_id=$(printf '%s' "$initiate_response" | jq -r '.uploadId // empty')
        presigned_url=$(printf '%s' "$initiate_response" | jq -r '.parts[0].url // empty')

        if [ -z "$upload_id" ] || [ -z "$presigned_url" ]; then
            printf "   \033[1;31mError:\033[0m Failed to initiate upload — %s\n" "$initiate_response" >&2
            exit 1
        fi

        # 3b — PUT file bytes directly to MinIO via presigned URL; capture ETag from headers
        # S3_PRESIGNEDURL_BASEURL is localhost:8085 (external), but inside Docker we must
        # reach MinIO at minio:9000. --connect-to redirects the TCP connection while keeping
        # the Host header as localhost:8085 so the SigV4 signature remains valid.
        etag=$(curl -s -X PUT "$presigned_url" \
            --connect-to "localhost:8085:minio:9000" \
            -H "Content-Length: ${file_size}" \
            --data-binary @"${file_path}" \
            -D - -o /dev/null \
            | grep -i '^ETag:' | tr -d '\r' | sed 's/[Ee][Tt][Aa][Gg]: *//;s/"//g')

        if [ -z "$etag" ]; then
            printf "   \033[1;31mError:\033[0m No ETag returned from presigned PUT\n" >&2
            exit 1
        fi

        # 3c — register the uploaded part with Score (Score needs ETag for integrity tracking)
        curl -s -X POST \
            "${SCORE_URL}/upload/${object_id}/parts?partNumber=1&uploadId=${upload_id}&md5=${file_md5}&etag=${etag}" \
            -H "${AUTH_HEADER}" > /dev/null

        # 3d — finalize: Score marks the upload complete in its state bucket
        curl -s -X POST \
            "${SCORE_URL}/upload/${object_id}?uploadId=${upload_id}" \
            -H "${AUTH_HEADER}" > /dev/null

        printf "      \033[1;32m✓ Uploaded\033[0m\n"
        i=$((i + 1))
    done

    # ── Step 4: Publish analysis (Song validates Score, emits Kafka event) ────
    printf "   \033[1;36mSong:\033[0m Publishing analysis\n"
    publish_response=$(curl -s -X PUT \
        "${SONG_URL}/studies/${STUDY_ID}/analysis/publish/${analysis_id}" \
        -H "${AUTH_HEADER}")

    if ! printf '%s' "$publish_response" | grep -qi "published"; then
        printf "   \033[1;31mError:\033[0m Publish failed — %s\n" "$publish_response" >&2
        exit 1
    fi
    printf "   \033[1;32mSuccess:\033[0m Published\n"
done

printf "\n\033[1;32mSuccess:\033[0m All %s analyses submitted and published\n" "$payload_count"
