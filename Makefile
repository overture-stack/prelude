# Define all phony targets (targets that don't create files)
.PHONY: dev-phase-one dev-stage clean-data reset-volumes load-sample-data

# Start Phase One development environment
phase-one:
	PROFILE=phaseOne docker compose -f ./docker-compose.phaseOne.yml --profile phaseOne up --attach conductor 

# Start Stage development environment
stage-dev:
	PROFILE=stageDev docker compose -f ./docker-compose.phaseOne.yml --profile stageDev up --attach conductor
	
# Gracefully shutdown all containers while preserving volumes
shutdown:
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
reset:
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
load-data:
	PROFILE=data docker compose -f ./docker-compose.phaseOne.yml --profile data up --attach conductor

# Remove all documents from Elasticsearch (preserves index structure)
clean-data:
	@echo "\033[1;33mWarning:\033[0m This will delete ALL data from the Elasticsearch index."
	@echo "This action cannot be undone."
	@/bin/bash -c 'read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=clean docker compose -f ./docker-compose.phaseOne.yml --profile clean up --attach conductor; \
	else \
		echo "\033[1;36mOperation cancelled\033[0m"; \
	fi'