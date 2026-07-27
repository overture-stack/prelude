#!/bin/sh
# init_bucket.sh
# Creates the Score object and state buckets in MinIO using the S3 REST API via curl --aws-sigv4.
# Idempotent: a 409 BucketAlreadyOwnedByYou response is treated as success.

create_bucket() {
    BUCKET="$1"
    printf "\033[1;36mSetup:\033[0m Creating MinIO bucket '%s'\n" "$BUCKET"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        --aws-sigv4 "aws:amz:${AWS_DEFAULT_REGION}:s3" \
        --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" \
        -X PUT \
        "${OBJECT_STORAGE_URL}/${BUCKET}")

    case "$HTTP_CODE" in
        200)
            printf "\033[1;32mSuccess:\033[0m Bucket '%s' created\n" "$BUCKET"
            ;;
        409)
            printf "\033[1;36mInfo:\033[0m Bucket '%s' already exists\n" "$BUCKET"
            ;;
        *)
            printf "\033[1;31mError:\033[0m Unexpected response %s when creating bucket '%s'\n" \
                "$HTTP_CODE" "$BUCKET"
            exit 1
            ;;
    esac
}

create_bucket "${SCORE_OBJECT_BUCKET:-object}"
create_bucket "${SCORE_STATE_BUCKET:-state}"

# Create the sentinel object Score uses to verify MinIO connectivity at startup
SENTINEL_BUCKET="${SCORE_OBJECT_BUCKET:-object}"
SENTINEL_KEY="data/${OBJECT_SENTINEL:-heliograph}"

printf "\033[1;36mSetup:\033[0m Creating sentinel object '%s/%s'\n" "$SENTINEL_BUCKET" "$SENTINEL_KEY"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --aws-sigv4 "aws:amz:${AWS_DEFAULT_REGION}:s3" \
    --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" \
    -X PUT \
    -H "Content-Length: 0" \
    "${OBJECT_STORAGE_URL}/${SENTINEL_BUCKET}/${SENTINEL_KEY}")

case "$HTTP_CODE" in
    200)
        printf "\033[1;32mSuccess:\033[0m Sentinel object created\n"
        ;;
    *)
        printf "\033[1;31mError:\033[0m Unexpected response %s creating sentinel object\n" "$HTTP_CODE"
        exit 1
        ;;
esac
