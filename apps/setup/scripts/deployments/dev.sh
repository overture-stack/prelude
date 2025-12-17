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
echo -e "\n\033[1;36m╔════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Spinning up Development Backend   ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════╝\033[0m\n"

# Elasticsearch Check
echo -e "\033[1;35m[1/4]\033[0m Checking Elasticsearch (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearch/elasticsearch_check.sh"

# Elasticsearch Setup
echo -e "\n\033[1;35m[2/4]\033[0m Setting up Elasticsearch Indices"
rs "$SCRIPT_DIR/elasticsearch/setup_indices.sh"

# Update Conductor to Healthy Status
echo -e "\n\033[1;35m[3/4]\033[0m Updating Conductor health status"
echo "healthy" > setup/volumes/health/setup_health
echo -e "   └─ \033[1;36mSetup:\033[0m Updating Container Status. Health check file created"

# Check Arranger
echo -e "\n\033[1;35m[4/4]\033[0m Checking Arranger Instances"
rs "$SCRIPT_DIR/arranger/arranger_check.sh"

# Remove Health Check File
rs "${SCRIPT_DIR}/utils/healthcheck_cleanup.sh"

echo -e "\033[1;32m✓ Backend services are ready!\033[0m\n"

echo -e "\033[1;33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\033[1;33m  Next Steps: Run the Custom UI Dev Server\033[0m"
echo -e "\033[1;33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"

echo -e "\033[1mTo start developing with hot-reload:\033[0m\n"
echo -e "  1. Open a new terminal window"
echo -e "  2. Navigate to the custom-ui directory:"
echo -e "     \033[0;36mcd apps/custom-ui\033[0m\n"
echo -e "  3. Install dependencies (first time only):"
echo -e "     \033[0;36mnpm install\033[0m\n"
echo -e "  4. Start the development server:"
echo -e "     \033[0;36mnpm run dev\033[0m\n"

echo -e "\033[1m📍 Services Available:\033[0m"
echo -e "  • Custom UI Dev Server:  \033[1;32mhttp://localhost:3002\033[0m"
echo -e "  • Arranger GraphQL API:  \033[1;32mhttp://localhost:5050\033[0m"
echo -e "  • Elasticsearch:         \033[1;32mhttp://localhost:9200\033[0m\n"

echo -e "\033[0;90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\033[0;90mNote: Your frontend changes will hot-reload automatically.\033[0m"
echo -e "\033[0;90mBackend services are running in Docker containers.\033[0m"
echo -e "\033[0;90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"
