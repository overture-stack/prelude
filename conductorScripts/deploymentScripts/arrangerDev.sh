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
rs /scripts/serviceScripts/elasticSearchSetup.sh

# Update Conductor to Healthy Status
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
rs /scripts/serviceScripts/stageSetup.sh

# Remove Health Check File 
rm /health/conductor_health

# Success and Next Steps
echo -e "\033[1;32mSuccess:\033[0m Arranger is now reachable"
echo -e "\033[1;36m╔════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Arranger Dev Service Setup Complete   ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════╝\033[0m"
echo -e "\033[1m1️⃣  To run Arranger locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/arranger.git\033[0m\n"
echo -e "\033[1m2️⃣  Then install the dependencies by running:\033[0m\n"
echo -e "   \033[1;32mnpm ci\033[0m\n"
echo -e "\033[1m3️⃣  Rename \033[1;32m.env.arrangerDev\033[0m to \033[1;32m.env:\033[0m\n"
echo -e "\033[1m4️⃣  Run the development server:\033[0m\n"
echo -e "   \033[1;32mnpm run dev\033[0m\n"