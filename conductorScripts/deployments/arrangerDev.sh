#!/bin/sh

# Welcome
echo -e "\033[1;36m╔═════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Welcome to the ArrangerDev QuickStart  ║\033[0m"
echo -e "\033[1;36m╚═════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Elasticsearch Setup
echo -e "\033[1;35m[1/2]\033[0m Setting up Elasticsearch"
rs /scripts/services/elasticSearchSetup.sh

# Update Conductor to Healthy Status
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
echo -e "\033[1;35m[2/2]\033[0m Checking Stage"
rs /scripts/services/stageCheck.sh

# Remove Health Check File 
rm /health/conductor_health

# Success and Next Steps
echo -e "\033[1;36m╔════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Arranger Dev Service Setup Complete   ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════╝\033[0m\n"
echo -e "\033[1m1️⃣  To run Arranger locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/arranger.git\033[0m\n"
echo -e "\033[1m2️⃣  Navigate to the cloned directory:\033[0m\n"
echo -e "   \033[1;32mcd arranger\033[0m\n"
echo -e "\033[1m3️⃣  Copy the example environment file:\033[0m\n"
echo -e "   \033[1;32mcp .env.arrangerDev .env\033[0m\n"
echo -e "\033[1m4️⃣  Install the dependencies:\033[0m\n"
echo -e "   \033[1;32mnpm ci\033[0m\n"
echo -e "\033[1m5️⃣  Bootstrap the project:\033[0m\n"
echo -e "   \033[1;32mnpm run bootstrap\033[0m\n"
echo -e "\033[1m6️⃣  Run the development server:\033[0m\n"
echo -e "   \033[1;32mnpm run server\033[0m\n"
