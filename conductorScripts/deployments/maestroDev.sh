#!/bin/sh

# Welcome
echo -e "\033[1;36m╔════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Welcome to the MaestroDev QuickStart  ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# KeycloakDb Setup
rs /scripts/services/keycloakDbSetup.sh

# SongDb Setup
rs /scripts/services/songDbSetup.sh

# Song Setup
rs /scripts/services/songSetup.sh

# Elasticsearch Setup
rs /scripts/services/elasticSearchSetup.sh

# Success and Next Steps
echo -e "\033[1;32mSuccess:\033[0m Arranger is now reachable"
echo -e "\033[1;36m╔══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Maestro Dev Service Setup Complete  ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════╝\033[0m"
echo -e "\033[1m1️⃣  To run Maestro locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/maestro.git\033[0m\n"
echo -e "\033[1m2️⃣  Then install the dependencies by running:\033[0m\n"
echo -e "   \033[1;32mnpm ci\033[0m\n"
echo -e "\033[1m3️⃣  Rename \033[1;32m.env.maestroDev\033[0m to \033[1;32m.env:\033[0m\n"
echo -e "\033[1m4️⃣  Run the development server:\033[0m\n"
echo -e "   \033[1;32mnpm run dev\033[0m\n"