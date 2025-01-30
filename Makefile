# Define all phony targets (targets that don't create files)
.PHONY: dev-phase-one dev-stage clean-data reset-volumes load-sample-data

# Start Phase One development environment
phase-one:
	PROFILE=phaseOne docker compose -f ./docker-compose.yml --profile phaseOne up --attach conductor 

# Start Phase Two development environment
phase-two:
	PROFILE=phaseTwo docker compose -f ./docker-compose.yml --profile phaseTwo up --attach conductor

# Start Phase Three development environment
phase-three:
	PROFILE=phaseThree docker compose -f ./docker-compose.yml --profile phaseThree up --attach conductor 

# Start Stage development environment
stage-dev:
	PROFILE=stageDev docker compose -f ./docker-compose.yml --profile stageDev up --attach conductor
	
# Gracefully shutdown all containers while preserving volumes
down:
	@{ \
		printf "\033[1;36mConductor:\033[0m Checking for containers...\n"; \
		if docker compose -f ./docker-compose.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase One containers...\n"; \
			PROFILE=phaseOne docker compose -f ./docker-compose.yml --profile phaseOne down ; \
		fi; \
		if docker compose -f ./docker-compose.yml.phaseTwo.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase Two containers...\n"; \
			PROFILE=phaseTwo docker compose -f ./docker-compose.yml.phaseTwo.yml --profile phaseTwo down ; \
		fi; \
		printf "\033[1;32mSuccess:\033[0m Cleanup completed\n"; \
	}

# Shutdown all containers and remove all volumes (WARNING: Deletes all data)
reset:
	@{ \
		printf "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost.\n"; \
		read -p "Are you sure you want to continue? [y/N] " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			printf "\033[1;36mConductor:\033[0m Removing all containers and volumes...\n"; \
			PROFILE=platform docker compose -f ./docker-compose.yml --profile platform down -v ; \
		fi; \
	}

# Load sample data into Elasticsearch
load-data:
	PROFILE=data docker compose -f ./docker-compose.yml --profile data up --attach conductor

# Remove all documents from Elasticsearch (preserves index structure)
clean-data:
	@echo "\033[1;33mWarning:\033[0m This will delete ALL data from the Elasticsearch index."
	@echo "This action cannot be undone."
	@/bin/bash -c 'read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=clean docker compose -f ./docker-compose.yml --profile clean up --attach conductor; \
	else \
		echo "\033[1;36mOperation cancelled\033[0m"; \
	fi'