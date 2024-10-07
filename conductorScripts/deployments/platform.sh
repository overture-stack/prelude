#!/bin/sh

# Welcome
echo -e "\033[1;36m╔═══════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Welcome to the Overture Platform QuickStart    ║\033[0m"
echo -e "\033[1;36m╚═══════════════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Cleanup any existing healthcheck file
rs scripts/services/healthcheckCleanup.sh

# Database Setups
echo -e "\033[1;35m[1/9]\033[0m Setting up Song & Keycloak databases"
rs /scripts/services/songDbSetup.sh
rs /scripts/services/keycloakDbSetup.sh

# Minio Check
echo -e "\033[1;35m[2/9]\033[0m Checking Minio Object Storage"
rs /scripts/services/minioCheck.sh

# Score Setup
echo -e "\033[1;35m[3/9]\033[0m Checking on Score"
rs /scripts/services/scoreCheck.sh

# Song Setup
echo -e "\033[1;35m[4/9]\033[0m Checking on Song"
rs /scripts/services/songCheck.sh

# Elasticsearch Setup
echo -e "\033[1;35m[5/9]\033[0m Setting up Elasticsearch"
rs /scripts/services/elasticSearchSetup.sh

# Update Conductor to Healthy Status, this signals search and exploration services (maestro, arranger, stage) to startup
echo "healthy" > /health/conductor_health
echo -e  "\033[1;36mConductor:\033[0m Updating Container Status. Health check file created"

# Check Stage
echo -e "\033[1;35m[7/9]\033[0m Checking Stage"
rs /scripts/services/stageCheck.sh

# Check Arranger
echo -e "\033[1;35m[6/9]\033[0m Checking Arranger"
rs /scripts/services/arrangerCheck.sh

# Check Maestro
echo -e "\033[1;35m[8/9]\033[0m Checking Maestro" 
rs /scripts/services/maestroCheck.sh

# Check Keycloak
echo -e "\033[1;35m[9/9]\033[0m Checking Keycloak"
rs /scripts/services/keycloakCheck.sh

# Remove Health Check File 
rm /health/conductor_health

# Success and Next Steps
echo -e "\033[1;36m╔══════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║    Overture QuickStart Setup Complete    ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════╝\033[0m"
echo -e "\n"
echo -e "\033[1m🌐 Front-end Portal:\033[0m"
echo -e "   \033[1;32mhttp://localhost:3000\033[0m\n"
echo -e "\033[1m📚 Overture Platform Guides:\033[0m"
echo -e "   \033[1;32mhttps://www.overture.bio/documentation/guides/\033[0m\n"
echo -e "\033[1m🛠️  QuickStart Information:\033[0m"
echo -e "   Check the \033[1;33mdocker-compose.yml\033[0m file for details on this QuickStart,"
echo -e "   including links to relevant sections of our deployment guide.\n"
