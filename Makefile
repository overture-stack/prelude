help:
	@echo "================ Prelude Makefile Commands ================"
	@echo ""
	@echo "Conductor Development Environments:"
	@echo "  phase0         - Run pre-deployment checks"
	@echo "  phase1         - Start Phase 1 deployment"
	@echo "  phase2         - Start Phase 2 deployment"
	@echo "  phase3         - Start Phase 3 deployment"
	@echo "  stage-dev      - Start Stage development environment"
	@echo ""
	@echo "Conductor System Management:"
	@echo "  down           - Gracefully shutdown all containers"
	@echo "  reset          - DANGER: Remove all containers and volumes (DATA LOSS)"
	@echo "  restart        - Restart containers for a specific profile"
	@echo ""
	@echo "General Usage:"
	@echo "  make help      - Show this help message"
	@echo "  make <command> - Run a specific command"
	@echo ""
	@echo "==============================================================="

# Run pre-deployment checks
phase0:
	@echo "Running Pre-deployment checks..."
	chmod +x ./apps/conductor/scripts/deployments/phase0.sh
	./apps/conductor/scripts/deployments/phase0.sh 

# Start Phase One deployment
phase1:
	@echo "Starting Phase 1 development environment..."
	PROFILE=phase1 docker compose -f ./docker-compose.yml --profile phase1 up --attach conductor 

# Start Phase Two deployment
phase2:
	@echo "Starting Phase 2 development environment..."
	PROFILE=phase2 docker compose -f ./docker-compose.yml --profile phase2 up --attach conductor

# Start Phase Three deployment
phase3:
	@echo "Starting Phase 3 development environment..."
	PROFILE=phase3 docker compose -f ./docker-compose.yml --profile phase3 up --attach conductor 

# Start Stage devepment deployment
stage-dev:
	@echo "Starting Stage development environment..."
	PROFILE=stageDev docker compose -f ./docker-compose.yml --profile stageDev up --attach conductor

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	PROFILE=default docker compose -f ./docker-compose.yml --profile default down

# Restart containers and run deployment scripts for a specific profile
restart:
	@echo "Restarting containers with fresh deployment..."
	@read -p "Enter profile to restart (phase1, phase2, phase3, stageDev): " profile; \
	echo "Shutting down containers..."; \
	PROFILE=$$profile docker compose -f ./docker-compose.yml --profile $$profile down; \
	echo "Starting containers with profile $$profile..."; \
	PROFILE=$$profile docker compose -f ./docker-compose.yml --profile $$profile up --attach conductor

# Shutdown all containers and remove all volumes (Deletes all data)
reset:
	@echo "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost."
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v ; \
	else \
		echo "Operation cancelled"; \
	fi

