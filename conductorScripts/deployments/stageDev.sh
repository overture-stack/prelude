#!/bin/sh

# Welcome
echo -e "\033[1;36m╔══════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Welcome to the StageDev QuickStart    ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Keycloak Db Setup
echo -e "\033[1;35m[1/4]\033[0m Setting up Keycloak database"
rs /scripts/services/keycloakDbSetup.sh

# Elasticsearch Setup
echo -e "\033[1;35m[2/4]\033[0m Setting up Elasticsearch"
rs /scripts/services/elasticSearchSetup.sh

# Update Conductor to Healthy Status
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Arranger
echo -e "\033[1;35m[3/4]\033[0m Checking Arranger"
rs /scripts/services/arrangerCheck.sh

# Keycloak Check
echo -e "\033[1;35m[4/4]\033[0m Checking Keycloak"
rs /scripts/services/keycloakCheck.sh

# Remove Health Check File 
rm /health/conductor_health

# Success and Next Steps
echo -e "\033[1;36m╔═══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   Stage Dev Service Setup Complete    ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════╝\033[0m\n"

echo -e "\033[1m1️⃣  To run Stage locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/stage.git\033[0m\n"

echo -e "\033[1m2️⃣  Navigate to the cloned directory:\033[0m\n"
echo -e "   \033[1;32mcd stage\033[0m\n"

echo -e "\033[1m3️⃣  Copy the example environment file:\033[0m\n"
echo -e "   \033[1;32mcp .env.stageDev .env\033[0m\n"

echo -e "\033[1m4️⃣  Install the dependencies:\033[0m\n"
echo -e "   \033[1;32mnpm ci\033[0m\n"

echo -e "\033[1m   This will require:\033[0m"
echo -e "\033[1;34m      - Node v16 or higher\033[0m"
echo -e "\033[1;34m      - npm v8.3.0 or higher\033[0m\n"

echo -e "\033[1m5️⃣  Run the development server:\033[0m\n"
echo -e "   \033[1;32mnpm run dev\033[0m\n"

echo -e "\033[1mYour development server will be accessible at:\n"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m\n"
