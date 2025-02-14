# Define all phony targets (targets that don't create files)
.PHONY: dev-phase1 dev-stage clean-data reset-volumes load-data generate-configs setup-all

# Start Phase One development environment
phase1:
	PROFILE=phase1 docker compose -f ./docker-compose.yml --profile phase1 up --attach conductor 

# Start Phase Two development environment
phase2:
	PROFILE=phase2 docker compose -f ./docker-compose.yml --profile phase2 up --attach conductor

# Start Phase Three development environment
phase3:
	PROFILE=phase3 docker compose -f ./docker-compose.yml --profile phase3 up --attach conductor 

# Start Stage development environment
stage-dev:
	PROFILE=stageDev docker compose -f ./docker-compose.yml --profile stageDev up --attach conductor
	
# Load sample data into Elasticsearch
load-data:
	PROFILE=data docker compose -f ./docker-compose.yml --profile data up --attach csv-processor

# Load dictionary schema to Lectern
load-lectern-schema:
	PROFILE=loadLectern docker compose -f ./docker-compose.yml --profile loadLectern up --attach conductor

register-dictionary:
	PROFILE=registerDictionary docker compose -f ./docker-compose.yml --profile registerDictionary up --attach conductor

load-lyric:
	PROFILE=loadLyric docker compose -f ./docker-compose.yml --profile loadLyric up --attach conductor

# Create a Song Study
create-song-study:
	PROFILE=createStudy docker compose -f ./docker-compose.yml --profile createStudy up --attach conductor

# Load a Song Schema
load-song-schema:
	PROFILE=loadSongSchema docker compose -f ./docker-compose.yml --profile loadSongSchema up --attach conductor

# Load a Song Data
load-song-data:
	PROFILE=loadSongData docker compose -f ./docker-compose.yml --profile loadSongData up --attach conductor

# Generate Elasticsearch and Arranger configurations
generate-configs:
	@echo "\033[1;36mConductor:\033[0m Generating configurations..."
	PROFILE=config docker compose -f ./docker-compose.yml --profile config up --attach csv-processor

# Generate configs and load data
setup-all:
	@echo "\033[1;36mConductor:\033[0m Setting up configurations and loading data..."
	PROFILE=all docker compose -f ./docker-compose.yml --profile all up --attach csv-processor

# Gracefully shutdown all containers while preserving volumes
down:
	@{ \
		printf "\033[1;36mConductor:\033[0m Checking for containers...\n"; \
		if docker compose -f ./docker-compose.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase One containers...\n"; \
			PROFILE=phase1 docker compose -f ./docker-compose.yml --profile phase1 down ; \
		fi; \
		if docker compose -f ./docker-compose.yml.phase2.yml ps -a -q 2>/dev/null | grep -q .; then \
			printf "\033[1;36mConductor:\033[0m Removing Phase Two containers...\n"; \
			PROFILE=phase2 docker compose -f ./docker-compose.yml.phase2.yml --profile phase2 down ; \
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