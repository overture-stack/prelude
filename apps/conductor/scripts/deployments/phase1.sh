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
rs "$SCRIPT_DIR/utils/healthcheck_cleanup.sh"

# Welcome
echo -e "\n\033[1;36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Spinning up the Prelude Phase One Development Portal   ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════════════════════╝\033[0m\n"

# Elasticsearch Check
echo -e "\033[1;35m[1/5]\033[0m Checking Elasticsearch (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearch/elasticsearch_check.sh"

# Elasticsearch Setup
echo -e "\n\033[1;35m[2/5]\033[0m Setting up Elasticsearch Indices"
rs "$SCRIPT_DIR/elasticsearch/setup_indices.sh"

# Update Conductor to Healthy Status
echo -e "\n\033[1;35m[3/5]\033[0m Updating Conductor health status"
echo "healthy" > conductor/volumes/health/conductor_health
echo -e "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
echo -e "\n\033[1;35m[4/5]\033[0m Checking Stage"
rs "$SCRIPT_DIR/stage/stage_check.sh"

# Check Arranger
echo -e "\n\033[1;35m[5/5]\033[0m Checking Arranger Instances"
rs "$SCRIPT_DIR/arranger/arranger_check.sh"

# Remove Health Check File
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

# Success and Next Steps
echo -e "\n\033[1;36m╔═══════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Prelude Phase One Development Portal running on localhost   ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════════════════════════════╝\033[0m\n"
echo -e "\033[1m🌐 Development Portal should now be available at:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m"
echo -e "   \033[0;90m(unless configured to use a different port)\033[0m\n"
echo -e "\033[1m📚 The PhaseOne usage guide can be found at:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000/documentation/phaseone\033[0m\n"
