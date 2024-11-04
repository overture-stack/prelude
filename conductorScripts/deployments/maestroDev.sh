#!/bin/sh

# Welcome
echo -e "\033[1;36m╔════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  Welcome to the MaestroDev QuickStart  ║\033[0m"
echo -e "\033[1;36m╚════════════════════════════════════════╝\033[0m"

# rs = "Run Script" a simple function to apply permissions and run scripts
rs() {
        chmod +x "$1" && "$1"
    }

# Keycloak and Song Db Setup
echo -e "\033[1;35m[1/6]\033[0m Setting up Song & Keycloak databases"
rs /scripts/services/keycloakDbSetup.sh
rs /scripts/services/songDbSetup.sh

# Minio Check
echo -e "\033[1;35m[2/6]\033[0m Checking Minio Object Storage"
rs /scripts/services/minioCheck.sh

# Score Setup
echo -e "\033[1;35m[3/6]\033[0m Checking on Score"
rs /scripts/services/scoreCheck.sh

# Song Check
echo -e "\033[1;35m[4/6]\033[0m Checking Song"
rs /scripts/services/songCheck.sh

# Elasticsearch Setup
echo -e "\033[1;35m[5/6]\033[0m Setting up Elasticsearch"
rs /scripts/services/elasticsearchSetup.sh

# Check Keycloak
echo -e "\033[1;35m[6/6]\033[0m Checking Keycloak"
rs /scripts/services/keycloakCheck.sh

# Success and Next Steps
echo -e "\033[1;36m╔══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║  MaestroDev Service Setup Complete   ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════╝\033[0m\n"

echo -e "\033[1m1️⃣  To run Score locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/maestro.git\033[0m\n"

echo -e "\033[1m2️⃣  Navigate to the cloned directory:\033[0m\n"
echo -e "   \033[1;32mcd maestro\033[0m\n"

echo -e "\033[1m3️⃣  Build the application \033[1;34m(requires JDK11 & Maven3)\033[0m:\033[0m\n"
echo -e "   \033[1;32m./mvnw clean install -DskipTests\033[0m\n"

echo -e "\033[1m4️⃣ Start the development server:\033[0m\n"
echo -e "   \033[1;32m./mvnw spring-boot:run -pl maestro-app\033[0m\n"

echo -e "\033[1mMaestro's Swagger UI can be accessed from:\n"
echo -e "   \033[1;32mhttp://localhost:11235/api-docs\033[0m\n"
