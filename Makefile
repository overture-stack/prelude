help:
	@echo "================ Prelude Makefile Commands ================"
	@echo ""
	@echo "Conductor Development Environments:"
	@echo "  phase1         - Start Phase 1 development environment"
	@echo "  phase2         - Start Phase 2 development environment"
	@echo "  phase3         - Start Phase 3 development environment"
	@echo "  stage-dev      - Start Stage development environment"
	@echo ""
	@echo "Conductor Deployment:"
	@echo "  pre-check      - Run pre-deployment checks"
	@echo "  deploy-stage   - Deploy the stage application (with pre-checks)"
	@echo ""
	@echo "Conductor Data Loading and Management:"
	@echo "  clean-data     - Remove all documents from Elasticsearch (preserves index structure)"
	@echo ""
	@echo "Conductor System Management:"
	@echo "  down           - Gracefully shutdown all containers"
	@echo "  reset          - DANGER: Remove all containers and volumes (DATA LOSS)"
	@echo ""
	@echo "Composer Configuration Generation:"
	@echo "  generate-phase-one-configs      - Generate Phase One Configurations"
	@echo "  generate-phase-two-configs      - Generate Phase Two Configurations"
	@echo "  generate-phase-three-configs    - Generate Phase Three Configurations"
	@echo ""
	@echo "General Usage:"
	@echo "  make help      - Show this help message"
	@echo "  make <command> - Run a specific command"
	@echo ""
	@echo "==============================================================="

# ================================================================================== #
#                                    Conductor:                                      #
# ================================================================================== #

# Run pre-deployment checks
phase0:
	@echo "Running Pre-deployment checks..."
	chmod +x ./apps/conductor/scripts/deployments/phase0.sh
	./apps/conductor/scripts/deployments/phase0.sh

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


# Deploy the stage application (with pre-checks)
deploy-stage: pre-check
	@echo "Deploying stage application..."
	docker build -t stageimage:1.0 .

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
#                                    Composer:                                       #
# ================================================================================== #

# Generate Phase One Configurations 
generate-phase-one-configs:
	@echo "Generating Phase One Configurations..."
	PROFILE=generatePhaseOneConfigs docker compose -f ./docker-composer.yml --profile generatePhaseOneConfigs up --attach composer

# Generate Phase Two Configurations 
generate-phase-two-configs:
	@echo "Generating Phase Two Configurations..."
	PROFILE=generatePhaseTwoConfigs docker compose -f ./docker-composer.yml --profile generatePhaseTwoConfigs up --attach composer

# Generate Phase Three Configurations 
generate-phase-three-configs:
	@echo "Generating Phase Three Configurations..."
	PROFILE=generatePhaseThreeConfigs docker compose -f ./docker-composer.yml --profile generatePhaseThreeConfigs up --attach composer