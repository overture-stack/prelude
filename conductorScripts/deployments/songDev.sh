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
echo -e "\033[1;36m╔══════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║   SongDev Service Setup Complete     ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════╝\033[0m\n"

echo -e "\033[1m1️⃣  To run Song locally, start by cloning the repo:\033[0m\n"
echo -e "   \033[1;32mgit clone https://github.com/overture-stack/song.git\033[0m\n"

echo -e "\033[1m2️⃣  Navigate to the cloned directory:\033[0m\n"
echo -e "   \033[1;32mcd song\033[0m\n"

echo -e "\033[1m3️⃣  Build the application \033[1;34m(Requires JDK11)\033[0m:\033[0m\n"
echo -e "   \033[1;32m./mvnw clean install -DskipTests\033[0m\n"

echo -e "\033[1m4️⃣ Start the development server:\033[0m\n"
echo -e "   \033[1;32m./mvnw spring-boot:run -Dspring-boot.run.profiles=default,dev,secure -pl song-server\033[0m\n"

echo -e "\033[1mSongs Swagger UI can be accessed from:\n"
echo -e "   \033[1;32mhttp://localhost:8080/swagger-ui.html\033[0m\n"
