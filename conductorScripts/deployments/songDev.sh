#!/bin/sh

# Welcome
echo -e "\033[1;36m╔═════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Welcome to the SongDev QuickStart  ║\033[0m"
echo -e "\033[1;36m╚═════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Keycloak and Song Db Setup
echo -e "\033[1;35m[1/4]\033[0m Setting up Song and Keycloak databases"
rs /scripts/services/keycloakDbSetup.sh
rs /scripts/services/songDbSetup.sh

# Minio Check
echo -e "\033[1;35m[2/4]\033[0m Checking Minio Object Storage"
rs /scripts/services/minioCheck.sh

# Score Setup
echo -e "\033[1;35m[3/4]\033[0m Checking Score"
rs /scripts/services/scoreCheck.sh

# Keycloak Check
echo -e "\033[1;35m[4/4]\033[0m Checking Keycloak"
rs /scripts/services/keycloakCheck.sh

# Success and Next Steps
