#!/bin/sh

# Set the base directory for scripts
SCRIPT_DIR="/setup/scripts/services"

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
rs "$SCRIPT_DIR/utils/healthcheck_cleanup.sh"

# Welcome
echo -e "\n\033[1;36m╔═══════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Spinning up the File Management Demo Portal    ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════════════════╝\033[0m\n"

# MinIO Object Storage Check
echo -e "\033[1;35m[1/9]\033[0m Checking MinIO Object Storage"
rs "${SCRIPT_DIR}/score/object_storage_check.sh"

# Score Setup
echo -e "\n\033[1;35m[2/9]\033[0m Checking Score (this may take a few minutes)"
rs "${SCRIPT_DIR}/score/score_check.sh"

# Song Setup
echo -e "\n\033[1;35m[3/9]\033[0m Checking Song"
rs "${SCRIPT_DIR}/song/song_check.sh"

# Elasticsearch Check
echo -e "\n\033[1;35m[4/9]\033[0m Checking Elasticsearch (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearch/elasticsearch_check.sh"

# Elasticsearch Setup
echo -e "\n\033[1;35m[5/9]\033[0m Setting up Elasticsearch Indices"
rs "$SCRIPT_DIR/elasticsearch/setup_indices.sh"

# Update Setup Container to Healthy Status
echo -e "\n\033[1;35m[6/9]\033[0m Updating setup container health status"
echo "healthy" > setup/volumes/health/setup_health
echo -e "   └─ \033[1;36mSetup:\033[0m Health check file created"

# Check Stage
echo -e "\n\033[1;35m[7/9]\033[0m Checking Stage"
rs "${SCRIPT_DIR}/stage/stage_check.sh"

# Check Arranger
echo -e "\n\033[1;35m[8/9]\033[0m Checking Arranger Instance"
rs "$SCRIPT_DIR/arranger/arranger_check.sh"

# Check Maestro
echo -e "\n\033[1;35m[9/9]\033[0m Checking Maestro"
rs "${SCRIPT_DIR}/maestro/maestro_check.sh"

# Remove Health Check File
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

# Success and Next Steps
# Signal to open browser on host machine
echo -e "\n\033[1;36m╔═════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Portal now running on localhost   ║\033[0m"
echo -e "\033[1;36m╚═════════════════════════════════════╝\033[0m\n"
echo -e "\033[1m🌐 File Management Demo Portal is now available at:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m"
echo -e "   \033[0;90m(unless configured to use a different port)\033[0m\n"
