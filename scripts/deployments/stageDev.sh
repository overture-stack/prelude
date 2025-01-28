a#!/bin/sh

# Debug mode flag (set to "true" to enable debug output)
DEBUG=false
# Set the base directory for scripts
SCRIPT_DIR="/scripts/services/phaseOne"

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
echo -e "\033[1;36m╔════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Spinning up the StageDev Environment    ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════════╝\033[0m"

# Cleanup any existing healthcheck file
echo -e "\033[1;35m[1/7]\033[0m Cleaning up existing health check files"
rs "${SCRIPT_DIR}/healthcheckCleanup.sh"

echo -e "\033[1;36mElasticsearch:\033[0m Starting up (this may take a few minutes)"
rs "${SCRIPT_DIR}/elasticsearchCheck.sh"

# Elasticsearch (File) Setup
echo -e "\033[1;35m[2/7]\033[0m Setting up File Data in Elasticsearch"
rs "${SCRIPT_DIR}/elasticsearchSetupFileData.sh"

# Elasticsearch (Tabular) Setup
echo -e "\033[1;35m[3/7]\033[0m Setting Tabular Data in Elasticsearch"
rs "${SCRIPT_DIR}/elasticsearchSetupTabularData.sh"

# Update Conductor to Healthy Status
echo -e "\033[1;35m[4/7]\033[0m Updating Conductor health status"
echo "healthy" > /health/conductor_health
echo -e "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Arranger
echo -e "\033[1;35m[6/7]\033[0m Checking Arranger"
rs "${SCRIPT_DIR}/arrangerCheck.sh"

echo -e "\033[1;35m[7/7]\033[0m Running mock data submission..."
rs "${SCRIPT_DIR}/submitMockData.sh"

# Remove Health Check File
rm /health/conductor_health

# Success and Next Steps
echo -e "\n" 
echo -e "\033[1;36m╔═══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Stage Dev Service Setup Complete    ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════╝\033[0m\n"

echo -e "\033[1m1️⃣  To run Stage locally, navigate to the  directory:\033[0m\n"
echo -e "   \033[1;32mcd apps/stage\033[0m\n"

echo -e "\033[1m2️⃣ Copy the example environment file:\033[0m\n"
echo -e "   \033[1;32mcp .env.stageDev .env\033[0m\n"

echo -e "\033[1m3️⃣   Install the dependencies:\033[0m\n"
echo -e "   \033[1;32mnpm ci\033[0m\n"

echo -e "\033[1m   This will require:\033[0m"
echo -e "\033[1;34m      - Node v16 or higher\033[0m"
echo -e "\033[1;34m      - npm v8.3.0 or higher\033[0m\n"

echo -e "\033[1m4️⃣   Run the development server:\033[0m\n"
echo -e "   \033[1;32mnpm run dev\033[0m\n"

echo -e "\033[1mYour development server will be accessible at:\n"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m\n"