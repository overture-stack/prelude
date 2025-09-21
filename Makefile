help:
	@echo "================ Prelude Makefile Commands ================"
	@echo ""
	@echo "setup Development Environments:"
	@echo "  phase0         - Run pre-deployment checks"
	@echo "  demo           - Start demo deployment (with data)"
	@echo "  phase1         - Start Phase 1 deployment (without data)"
	@echo ""
	@echo "  stage-dev      - Start Stage development environment"
	@echo ""
	@echo "setup System Management:"
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
	chmod +x ./apps/setup/scripts/deployments/phase0.sh
	./apps/setup/scripts/deployments/phase0.sh 

# Start demo deployment (populates portal with data for you)
demo:
	@echo "\033[1;36mStarting demo environment...\033[0m"
	@echo ""
	@echo "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m"
	@echo ""
	@echo ""
	@echo ""
	@docker compose build stage 2>&1 | { \
		line1=""; line2=""; line3=""; \
		while IFS= read -r line; do \
			line1="$$line2"; line2="$$line3"; line3="$$line"; \
			printf "\033[4A\033[2K\r\033[1;33mBuilding docker image...\033[0m\n"; \
			[ -n "$$line1" ] && echo "$$line1" || echo ""; \
			[ -n "$$line2" ] && echo "$$line2" || echo ""; \
			[ -n "$$line3" ] && echo "$$line3" || echo ""; \
		done; \
	}
	@echo ""
	@echo "\033[1;32mPortal UI built!\033[0m"
	@echo ""
	@PROFILE=demo docker compose -f ./docker-compose.yml --profile demo up --attach setup 

# Start Phase One deployment (you configure the portal for your data)
phase1:
	@echo "\033[1;36mStarting Phase 1 development environment...\033[0m"
	@echo ""
	@echo "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m"
	@echo ""
	@echo ""
	@echo ""
	@docker compose build stage 2>&1 | { \
		line1=""; line2=""; line3=""; \
		while IFS= read -r line; do \
			line1="$$line2"; line2="$$line3"; line3="$$line"; \
			printf "\033[4A\033[2K\r\033[1;33mBuilding docker image...\033[0m\n"; \
			[ -n "$$line1" ] && echo "$$line1" || echo ""; \
			[ -n "$$line2" ] && echo "$$line2" || echo ""; \
			[ -n "$$line3" ] && echo "$$line3" || echo ""; \
		done; \
	}
	@echo ""
	@echo "\033[1;32mPortal UI built!\033[0m"
	@echo ""
	@PROFILE=phase1 docker compose -f ./docker-compose.yml --profile phase1 up --attach setup 


# Start Stage devepment deployment
stage-dev:
	@echo "Starting Stage development environment..."
	PROFILE=stageDev docker compose -f ./docker-compose.yml --profile stageDev up --attach setup

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	PROFILE=default docker compose -f ./docker-compose.yml --profile default down

# Restart containers and run deployment scripts for a specific profile
restart:
	@echo "Restarting containers with fresh deployment..."
	@read -p "Enter profile to restart (phase1, demo, stageDev): " profile; \
	echo "Shutting down containers..."; \
	PROFILE=$$profile docker compose -f ./docker-compose.yml --profile $$profile down; \
	echo "Starting containers with profile $$profile..."; \
	PROFILE=$$profile docker compose -f ./docker-compose.yml --profile $$profile up --attach setup

# Shutdown all containers and remove all volumes (Deletes all data)
reset:
	@echo "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost."
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v ; \
	else \
		echo "Operation cancelled"; \
	fi

