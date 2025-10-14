help:
	@echo "================ Prelude Makefile Commands ================"
	@echo ""
	@echo "setup Development Environments:"
	@echo "  phase0         - Run pre-deployment checks"
	@echo "  demo           - Start demo deployment (with data)"
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
	chmod +x ./setup/scripts/deployments/phase0.sh
	./setup/scripts/deployments/phase0.sh 

# Start demo deployment (populates portal with data for you)
demo: phase0
	@echo ""
	@echo "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m"
	@echo ""
	@echo ""
	@echo ""
	@docker compose build stage 2>&1 | { \
		line1=""; line2=""; line3=""; \
		while IFS= read -r line; do \
			line1="$$line2"; line2="$$line3"; line3="$$line"; \
			printf "\033[4A\033[2K\r\033[1;33mBuilding portal UI (stage) image (this may take a minute)....\033[0m\n"; \
			[ -n "$$line1" ] && echo "$${line1:0:64}" || echo ""; \
			[ -n "$$line2" ] && echo "$${line2:0:64}" || echo ""; \
			[ -n "$$line3" ] && echo "$${line3:0:64}" || echo ""; \
		done; \
	}
	@echo ""
	@echo "\033[1;32mStage Portal UI built\033[0m"
	@echo ""
	@./setup/scripts/services/utils/open-browser-monitor.sh & PROFILE=demo docker compose -f ./docker-compose.yml --profile demo up --attach setup 

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	PROFILE=default docker compose -f ./docker-compose.yml --profile default down

# Restart containers and run deployment scripts for a specific profile
restart:
	@echo "Restarting containers with fresh deployment..."
	echo "Shutting down containers..."; \
	PROFILE=demo docker compose -f ./docker-compose.yml --profile demo down; \
	echo "Starting containers with profile demo..."; \
	./setup/scripts/services/utils/open-browser-monitor.sh & PROFILE=demo docker compose -f ./docker-compose.yml --profile demo up --attach setup

# Shutdown all containers and remove all volumes (Deletes all data)
reset:
	@echo "\033[1;33mWarning:\033[0m This will remove all containers AND their volumes. Data will be lost."
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v ; \
	else \
		echo "Operation cancelled"; \
	fi

