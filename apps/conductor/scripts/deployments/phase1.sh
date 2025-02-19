#!/bin/sh

# Set the base directory for scripts
SCRIPT_DIR="/scripts/services/phase1"

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

# Welcome
echo -e "\033[1;36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Spinning up the Prelude Phase One Development Portal   ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════════════════════╝\033[0m"

# Cleanup any existing healthcheck file
echo -e "\n\033[1;35m[1/6]\033[0m Cleaning up existing health check files"
rs "${SCRIPT_DIR}/healthcheckCleanup.sh"

echo -e "\033[1;36mElasticsearch:\033[0m Starting up (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearchCheck.sh"

# Elasticsearch (File) Setup
echo -e "\n\033[1;35m[2/6]\033[0m Setting up File Data in Elasticsearch"
rs "${SCRIPT_DIR}/elasticsearchSetupFileData.sh"

# Elasticsearch (Tabular) Setup
echo -e "\n\033[1;35m[3/6]\033[0m Setting Tabular Data in Elasticsearch"
rs "${SCRIPT_DIR}/elasticsearchSetupTabularData.sh"

# Update Conductor to Healthy Status
echo -e "\n\033[1;35m[4/6]\033[0m Updating Conductor health status"
echo "healthy" > /health/conductor_health
echo -e "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
echo -e "\n\033[1;35m[5/6]\033[0m Checking Stage"
rs "${SCRIPT_DIR}/stageCheck.sh"

# Check Arranger
echo -e "\n\033[1;35m[6/6]\033[0m Checking Arranger"
rs "${SCRIPT_DIR}/arrangerCheck.sh"

# Remove Health Check File
rm /health/conductor_health
echo -e "\n"

# Success and Next Steps
echo -e "\033[1;36m╔═════════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Prelude Phase One Development Portal running on localhost     ║\033[0m"
echo -e "\033[1;36m╚═════════════════════════════════════════════════════════════════╝\033[0m\n"
echo -e "\033[1m🌐 Development Portal should now be available at:\033[0m\n"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m"
echo -e "   \033[0;90m(unless configured to use a different port)\033[0m\n"
