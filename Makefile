# ================================================================================== #
#                                                                                    #
#                                    Conductor:                                      #
#                                                                                    #
# ================================================================================== #

help:
	@echo "================ Conductor and Composer Makefile Commands ================"
	@echo ""
	@echo "Conductor Development Environments:"
	@echo "  phase1         - Start Phase 1 development environment"
	@echo "  phase2         - Start Phase 2 development environment"
	@echo "  phase3         - Start Phase 3 development environment"
	@echo "  stage-dev      - Start Stage development environment"
	@echo ""
	@echo "Conductor Data Loading and Management, file paths and other envs can be updated from the docker-compose:"
	@echo "  load-data               - Load sample data directly into Elasticsearch"
	@echo "  load-lectern-schema     - Load dictionary schema to Lectern"
	@echo "  register-dictionary     - Register dictionary in Lyric"
	@echo "  load-lyric              - Submit tabular data to Lyric"
	@echo "  index-lyric-data        - Index tabular data in Lyric"
	@echo "  create-song-study       - Create a Song Study"
	@echo "  load-song-schema        - Load a Song Schema"
	@echo "  load-song-data          - Submit Song Data"
	@echo "  index-song-data         - Index Song Data"
	@echo ""
	@echo "Conductor System Management:"
	@echo "  down          - Gracefully shutdown all containers"
	@echo "  reset         - DANGER: Remove all containers and volumes (DATA LOSS)"
	@echo ""
	@echo "Composer Configuration Generation:"
	@echo "  generate-song-schema           - Generate Song Schema configuration"
	@echo "  generate-lectern-dictionary    - Generate Lectern Dictionary"
	@echo "  generate-elasticsearch-mapping - Generate Elasticsearch Mapping"
	@echo "  generate-arranger-configs      - Generate Arranger Configurations"
	@echo ""
	@echo "General Usage:"
	@echo "  make help     - Show this help message"
	@echo "  make <command> - Run a specific command"
	@echo ""
	@echo "==============================================================="

# Define all phony targets (targets that don't create files)
.PHONY: dev-phase1 dev-phase2 dev-phase3 dev-stage clean-data reset-volumes load-data generate-configs setup-all down reset

# Start Phase One development environment
phase1:
	@echo "Starting Phase 1 development environment..."
	PROFILE=phase1 docker compose -f ./docker-compose.yml --profile phase1 up --attach conductor 

# Start Phase Two development environment
phase2:
	@echo "Starting Phase 2 development environment..."
	PROFILE=phase2 docker compose -f ./docker-compose.yml --profile phase2 up --attach conductor

# Start Phase Three development environment
phase3:
	@echo "Starting Phase 3 development environment..."
	PROFILE=phase3 docker compose -f ./docker-compose.yml --profile phase3 up --attach conductor 

# Start Stage development environment
stage-dev:
	@echo "Starting Stage development environment..."
	PROFILE=stageDev docker compose -f ./docker-compose.yml --profile stageDev up --attach conductor

# Load sample data into Elasticsearch
load-data:
	@echo "Loading sample data into Elasticsearch..."
	PROFILE=phaseOneSubmission docker compose -f ./docker-compose.yml --profile phaseOneSubmission up --attach conductor

# Load dictionary schema to Lectern
load-lectern-schema:
	@echo "Loading dictionary schema into Lectern..."
	PROFILE=loadLecternDictionary docker compose -f ./docker-compose.yml --profile loadLecternDictionary up --attach conductor

# Register dictionary in Lyric
register-dictionary:
	@echo "Registering dictionary in Lyric..."
	PROFILE=registerLyricDictionary docker compose -f ./docker-compose.yml --profile registerLyricDictionary up --attach conductor

# Submit tabular data to Lyric
load-lyric:
	@echo "Submitting tabular data to Lyric..."
	PROFILE=submitLyricData docker compose -f ./docker-compose.yml --profile submitLyricData up --attach conductor

# Index tabular data in Lyric
index-lyric-data:
	@echo "Indexing tabular data in Lyric..."
	PROFILE=indexLyricData docker compose -f ./docker-compose.yml --profile indexLyricData up --attach conductor

# Create a Song Study
create-song-study:
	@echo "Creating a Song Study..."
	PROFILE=createSongStudy docker compose -f ./docker-compose.yml --profile createSongStudy up --attach conductor

# Load a Song Schema
load-song-schema:
	@echo "Loading Song Schema..."
	PROFILE=loadSongSchema docker compose -f ./docker-compose.yml --profile loadSongSchema up --attach conductor

# Submit Song Data
load-song-data:
	@echo "Submitting Song Data..."
	PROFILE=submitSongData docker compose -f ./docker-compose.yml --profile submitSongData up --attach conductor

# Index Song Data
index-song-data:
	@echo "Indexing Song Data..."
	PROFILE=indexSongData docker compose -f ./docker-compose.yml --profile indexSongData up --attach conductor

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	PROFILE=default docker compose -f ./docker-compose.yml --profile default down

# Shutdown all containers and remove all volumes (WARNING: Deletes all data)
reset:
	@echo "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost."
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v ; \
	else \
		echo "Operation cancelled"; \
	fi

# Remove all documents from Elasticsearch (preserves index structure)
clean-data:
	@echo "\033[1;33mWarning:\033[0m This will delete ALL data from the Elasticsearch index."
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=clean docker compose -f ./docker-compose.yml --profile clean up --attach conductor; \
	else \
		echo "\033[1;36mOperation cancelled\033[0m"; \
	fi

# ================================================================================== #
#                                                                                    #
#                                    Composer:                                       #
#                                                                                    #
# ================================================================================== #

# Define phony targets
.PHONY: generate-song-schema generate-lectern-dictionary generate-elasticsearch-mapping \
        generate-arranger-configs generate-all-configs run-default clean help

# Generate Song schema
generate-song-schema:
	@echo "Generating Song Schema..."
	@docker compose -f ./docker-composer.yml  run --rm -e PROFILE=generateSongSchema composer

# Generate Lectern dictionary
generate-lectern-dictionary:
	@echo "Generating Lectern Dictionary..."
	@docker compose -f ./docker-composer.yml run --rm -e PROFILE=generateLecternDictionary composer

# Generate Elasticsearch mapping
generate-elasticsearch-mapping:
	@echo "Generating Elasticsearch Mapping..."
	PROFILE=generateElasticSearchMapping docker compose -f ./docker-composer.yml --profile generateElasticSearchMapping up

# Generate Arranger configurations
generate-arranger-configs:
	@echo "Generating Arranger Configurations..."
	@docker compose -f ./docker-composer.yml up

# Generate all configurations
generate-all-configs:
	@echo "Generating All Configurations..."
	PROFILE=generateConfigs docker compose -f ./docker-composer.yml up 

# Run default profile
run-default:
	@echo "Running Default Composer Profile..."
	@docker compose -f ./docker-composer.yml run --rm -e PROFILE=default composer

# Clean up Docker containers and volumes
clean:
	@echo "Cleaning up Docker containers and volumes..."
	@docker compose -f ./docker-composer.yml down -v --remove-orphans

# Default target
default: help