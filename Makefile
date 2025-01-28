# Define all phony targets (targets that don't create files)
.PHONY: phaseOne phaseTwo down clean cleanVolumes mockData

# Start Phase One development environment
phaseOne:
	PROFILE=phaseOne docker compose -f ./docker-compose.phaseOne.yml --profile phaseOne up --attach conductor 

# Start Phase Two development environment
stageDev:
	PROFILE=stageDev docker compose -f ./docker-compose.phaseOne.yml --profile stageDev up --attach conductor
	
# Gracefully shutdown all containers while preserving volumes
down:
	@{ \
		printf "\033[1;36mConductor:\033[0m Checking for containers...\n"; \
		if docker compose -f ./docker-compose.phaseOne.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase One containers...\n"; \
			PROFILE=phaseOne docker compose -f ./docker-compose.phaseOne.yml --profile phaseOne down ; \
		fi; \
		if docker compose -f ./docker-compose.phaseTwo.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase Two containers...\n"; \
			PROFILE=phaseTwo docker compose -f ./docker-compose.phaseTwo.yml --profile phaseTwo down ; \
		fi; \
		printf "\033[1;32mSuccess:\033[0m Cleanup completed\n"; \
	}

# Shutdown all containers and remove all volumes (WARNING: Deletes all data)
downVolumes:
	@{ \
		printf "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost.\n"; \
		read -p "Are you sure you want to continue? [y/N] " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			printf "\033[1;36mConductor:\033[0m Checking for containers...\n"; \
			if docker compose -f ./docker-compose.phaseOne.yml ps -a -q 2>/dev/null | grep -q .; then \
				printf "\033[1;36mConductor:\033[0m Removing Phase One containers and volumes...\n"; \
				PROFILE=phaseOne docker compose -f ./docker-compose.phaseOne.yml --profile phaseOne down -v; \
			fi; \
			if docker compose -f ./docker-compose.phaseTwo.yml ps -a -q 2>/dev/null | grep -q .; then \
				printf "\033[1;36mConductor:\033[0m Removing Phase Two containers and volumes...\n"; \
				PROFILE=phaseTwo docker compose -f ./docker-compose.phaseTwo.yml --profile phaseTwo down -v; \
			fi; \
			printf "\033[1;32mSuccess:\033[0m Cleanup completed\n"; \
		else \
			printf "\033[1;36mOperation cancelled\033[0m\n"; \
		fi \
	}

# Load sample data into Elasticsearch
mockData:
	PROFILE=mockData docker compose -f ./docker-compose.phaseOne.yml --profile mockData up --attach conductor

# Remove all documents from Elasticsearch (preserves index structure)
clean:
	@echo "\033[1;33mWarning:\033[0m This will delete ALL data from the Elasticsearch index."
	@echo "This action cannot be undone."
	@/bin/bash -c 'read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=clean docker compose -f ./docker-compose.phaseOne.yml --profile clean up --attach conductor; \
	else \
		echo "\033[1;36mOperation cancelled\033[0m"; \
	fi'