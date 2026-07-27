#!/bin/sh
# create_study.sh
# Creates a Song study using env-configured values.
# Idempotent: a 409 Conflict response means the study already exists and is treated as success.

printf "\033[1;36mSetup:\033[0m Creating Song study '%s'\n" "$SONG_STUDY_ID"

HTTP_CODE=$(curl -s -o /tmp/song_study_response.json -w "%{http_code}" \
    -X POST \
    "${SONG_URL}/studies/${SONG_STUDY_ID}/" \
    -H "accept: */*" \
    -H "Content-Type: application/json" \
    -d "{
      \"studyId\": \"${SONG_STUDY_ID}\",
      \"name\": \"${SONG_STUDY_NAME}\",
      \"description\": \"${SONG_STUDY_DESCRIPTION}\",
      \"organization\": \"${SONG_STUDY_ORGANIZATION}\"
    }")

case "$HTTP_CODE" in
    200|201)
        printf "\033[1;32mSuccess:\033[0m Study '%s' created\n" "$SONG_STUDY_ID"
        ;;
    409)
        printf "\033[1;36mInfo:\033[0m Study '%s' already exists\n" "$SONG_STUDY_ID"
        ;;
    *)
        printf "\033[1;31mError:\033[0m Unexpected response %s when creating study '%s'\n" \
            "$HTTP_CODE" "$SONG_STUDY_ID"
        cat /tmp/song_study_response.json 2>/dev/null
        printf "\n"
        exit 1
        ;;
esac
