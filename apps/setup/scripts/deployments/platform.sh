#!/bin/sh

SCRIPT_DIR="/setup/scripts/services"

debug() {
    if [ "$DEBUG" = "true" ]; then
        echo "[DEBUG] $1"
    fi
}

# rs = "Run Script": chmod +x then execute
rs() {
    if [ -f "$1" ]; then
        debug "Running: $1"
        chmod +x "$1" && sh "$1"
    else
        echo "Script not found: $1"
        return 1
    fi
}

# Install dependencies
echo -e "\033[1;36mSetup:\033[0m Installing tools"
apk add --no-cache netcat-openbsd > /dev/null 2>&1

# Cleanup any leftover health file from a previous run
rs "$SCRIPT_DIR/utils/healthcheck_cleanup.sh"

echo -e "\n\033[1;36m╔══════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║        Spinning up the Overture Demo Portal          ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════════════════╝\033[0m\n"

# ------------------------------------------------------------------
echo -e "\033[1;35m[1/12]\033[0m Checking Elasticsearch"
rs "$SCRIPT_DIR/elasticsearch/elasticsearch_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[2/12]\033[0m Setting up Elasticsearch index (file_centric)"
rs "$SCRIPT_DIR/elasticsearch/setup_indices.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[3/12]\033[0m Signalling healthy — Stage and Arranger will now start"
echo "healthy" > setup/volumes/health/setup_health
echo -e "   └─ \033[1;36mSetup:\033[0m Health file written"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[4/12]\033[0m Checking Stage and Arranger"
rs "$SCRIPT_DIR/stage/stage_check.sh"
rs "$SCRIPT_DIR/arranger/arranger_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[5/12]\033[0m Checking MinIO"
rs "$SCRIPT_DIR/score/object_storage_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[6/12]\033[0m Creating MinIO buckets (object, state)"
rs "$SCRIPT_DIR/score/init_bucket.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[7/12]\033[0m Checking Kafka"
rs "$SCRIPT_DIR/kafka/kafka_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[8/12]\033[0m Checking Song"
rs "$SCRIPT_DIR/song/song_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[9/12]\033[0m Creating Song study"
rs "$SCRIPT_DIR/song/create_study.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[10/12]\033[0m Registering Song schemas"
rs "$SCRIPT_DIR/song/submit_schemas.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[11/12]\033[0m Checking Score"
rs "$SCRIPT_DIR/score/score_check.sh"

# ------------------------------------------------------------------
echo -e "\n\033[1;35m[12/12]\033[0m Checking Maestro"
rs "$SCRIPT_DIR/maestro/maestro_check.sh"

# Cleanup
rs "$SCRIPT_DIR/utils/healthcheck_cleanup.sh"

# Signal browser open on host
STAGE_PORT="${STAGE_PORT:-3000}"
echo "OPEN_BROWSER:http://localhost:${STAGE_PORT}" > /health/open_browser_signal

# Notify if Stage is on a non-default port
if [ "$STAGE_PORT" != "3000" ]; then
    echo -e "\033[1;33m⚠  Note: port 3000 was occupied on the host; Stage is available on port ${STAGE_PORT}\033[0m"
fi

echo -e "\n\033[1;36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║        Overture Demo Portal is now running          ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════════════════════╝\033[0m\n"
echo -e "\033[1mPortal:\033[0m  \033[1;32mhttp://localhost:${STAGE_PORT}\033[0m"
echo -e "\033[1mSong:\033[0m    \033[1;32mhttp://localhost:8080/swagger-ui.html\033[0m"
echo -e "\033[1mScore:\033[0m   \033[1;32mhttp://localhost:8087\033[0m"
echo -e "\033[1mMaestro:\033[0m \033[1;32mhttp://localhost:11235/api-docs\033[0m\n"
echo -e "Run \033[1mmake submit\033[0m to load sample data into Song and Score.\n"
