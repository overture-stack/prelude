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
echo -e "\n\033[1;36m╔════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Spinning up the StageDev Environment    ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════════╝\033[0m\n"

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

# Check Arranger
echo -e "\n\033[1;35m[5/5]\033[0m Checking Arranger Instances"
rs "$SCRIPT_DIR/arranger/arranger_check.sh"

# Remove Health Check File
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

# Success and Next Steps
echo -e "\n\033[1;36m╔═══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Stage Dev Service Setup Complete    ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════╝\033[0m\n"

echo -e "\033[1m1️⃣  To run Stage locally, navigate to the directory:\033[0m"
echo -e "   \033[1;32mcd apps/stage\033[0m\n"

echo -e "\033[1m2️⃣  Copy the example environment file:\033[0m"
echo -e "   \033[1;32mcp .env.stageDev .env\033[0m\n"

echo -e "\033[1m3️⃣  Install the dependencies:\033[0m"
echo -e "   \033[1;32mnpm ci\033[0m"

echo -e "   \033[1mThis will require:\033[0m"
echo -e "   \033[1;34m- Node v16 or higher\033[0m"
echo -e "   \033[1;34m- npm v8.3.0 or higher\033[0m\n"

echo -e "\033[1m4️⃣  Run the development server:\033[0m"
echo -e "   \033[1;32mnpm run dev\033[0m\n"

echo -e "\033[1mYour development server will be accessible at:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m\n"