#!/bin/sh

# Welcome
echo -e "\033[1;36m╔══════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Welcome to the Overture QuickStart    ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Database Setups
rs /scripts/serviceScripts/songDbSetup.sh
rs /scripts/serviceScripts/keycloakDbSetup.sh

# Elasticsearch Setup
rs /scripts/serviceScripts/elasticSearchSetup.sh

# Song Setup
rs /scripts/serviceScripts/songSetup.sh

# Update Conductor to Healthy Status
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Maestro
rs /scripts/serviceScripts/maestroSetup.sh

# Check Arranger
rs /scripts/serviceScripts/arrangerSetup.sh

# Check Stage
rs /scripts/serviceScripts/stageSetup.sh

# Success & Next Steps
rs /scripts/serviceScripts/successQuickStart.sh

# Remove Health Check File 
rm /health/conductor_health

# Success and Next Steps
echo -e "\033[1;36m╔══════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Overture QuickStart Setup Complete    ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════╝\033[0m"
echo -e "\033[1m🌐 Front-end Portal:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m\n"
echo -e "\033[1m📚 Overture Platform Guides:\033[0m"
echo -e "   \033[1;32mhttps://www.overture.bio/documentation/guides/\033[0m\n"
echo -e "\033[1m🛠️  QuickStart Information:\033[0m"
echo -e "   Check the \033[1;33mdocker-compose.yml\033[0m file for details on this QuickStart,"
echo -e "   including links to relevant sections of our deployment guide.\n"