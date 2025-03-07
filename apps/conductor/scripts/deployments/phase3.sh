#!/bin/sh

# Set the base directory for scripts
SCRIPT_DIR="/conductor/scripts/services"


# Debug function for logging
debug() {
    if [ "$DEBUG" = "true" ]; then
        echo "[DEBUG] $1"
    fi
}

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
    if [ -f "$1" ]; then
        debug "Found script at: $1"
        debug "Current permissions: $(ls -l "$1")"
        if chmod +x "$1"; then
            debug "Successfully set execute permissions"
            debug "New permissions: $(ls -l "$1")"
            debug "Attempting to execute with sh explicitly..."
            sh "$1"
        else
            echo "Failed to set execute permissions for $1"
            return 1
        fi
    else
        echo "Script not found at: $1"
        return 1
    fi
}
# Cleanup any existing healthcheck file
echo -e "Cleaning up any existing health check files"
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

# Welcome
echo -e "\n\033[1;36m╔════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Spinning up the Prelude Phase Three Development Portal   ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════════════════════════╝\033[0m\n"

# Lectern Setup
echo -e "\033[1;35m[1/11]\033[0m Checking on Lectern"
rs "${SCRIPT_DIR}/lectern/lectern_check.sh"

# Lyric Setup
echo -e "\n\033[1;35m[2/11]\033[0m Checking on Lyric"
rs "${SCRIPT_DIR}/lyric/lyric_check.sh"

# Minio Check
echo -e "\n\033[1;35m[3/11]\033[0m Checking Minio Object Storage"
rs "${SCRIPT_DIR}/score/object_storage_check.sh"

# Score Setup
echo -e "\n\033[1;35m[4/11]\033[0m Checking on Score (this may take a few minutes)"
rs "${SCRIPT_DIR}/score/score_check.sh"

# Song Setup
echo -e "\n\033[1;35m[5/11]\033[0m Checkng on Song"
rs "${SCRIPT_DIR}/song/song_check.sh"

# Elasticsearch Check
echo -e "\n\033[1;35m[6/11]\033[0m Checking Elasticsearch (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearch/elasticsearch_check.sh"

# Elasticsearch Setup
echo -e "\n\033[1;35m[7/11]\033[0m Setting up Elasticsearch Indices"
rs "$SCRIPT_DIR/elasticsearch/setup_indices.sh"

# Update Conductor to Healthy Status
echo -e "\n\033[1;35m[8/11]\033[0m Updating Conductor health status"
echo "healthy" > conductor/volumes/health/conductor_health
echo -e "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
echo -e "\n\033[1;35m[9/11]\033[0m Checking Stage"
rs "${SCRIPT_DIR}/stage/stage_check.sh"

# Check Arranger
echo -e "\n\033[1;35m[10/11]\033[0m Checking Arranger"
rs "${SCRIPT_DIR}/arranger/arranger_check.sh"

# Check Maestro
echo -e "\n\033[1;35m[11/11]\033[0m Checking Maestro" 
rs "${SCRIPT_DIR}/maestro/maestro_check.sh"

# Remove Health Check File
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

# Success and Next Steps
echo -e "\n\033[1;36m╔═══════════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Prelude Phase Three Development Portal running on localhost     ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════════════════════════════════╝\033[0m\n"
echo -e "\033[1m🌐 Development Portal should now be available at:\033[0m\n"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m"
echo -e "   \033[0;90m(unless configured to use a different port)\033[0m\n"
