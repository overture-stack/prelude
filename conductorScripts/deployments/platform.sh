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
echo -e "\033[1;35m[1/6]\033[0m Starting up postgres databases"
rs /scripts/services/songDbSetup.sh
rs /scripts/services/keycloakDbSetup.sh

# Elasticsearch Setup
echo -e "\033[1;35m[2/6]\033[0m Setting up Elasticsearch"
rs /scripts/services/elasticSearchSetup.sh

# Song Setup
echo -e "\033[1;35m[3/6]\033[0m Starting up Song"
rs /scripts/services/songSetup.sh

# Update Conductor to Healthy Status
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Maestro
echo -e "\033[1;35m[4/6]\033[0m Starting up Maestro (this may take a few minutes)" 
rs /scripts/services/maestroSetup.sh

# Check Arranger
echo -e "\033[1;35m[5/6]\033[0m Setting up Arranger"
rs /scripts/services/arrangerSetup.sh

# Check Stage
echo -e "\033[1;35m[6/6]\033[0m Checking on Stage"
rs /scripts/services/stageSetup.sh

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
