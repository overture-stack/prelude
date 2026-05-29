SHELL := /bin/bash
.DEFAULT_GOAL := help

# Auto-detect Stage port: use 3001 if port 3000 is already occupied (e.g. Docusaurus)
STAGE_PORT := $(shell bash -c '(echo > /dev/tcp/localhost/3000) 2>/dev/null && echo 3001 || echo 3000')

help:
	@echo "================ Prelude Makefile Commands ================"
	@echo ""
	@echo "Getting Started:"
	@echo "  make demo              - Start demo deployment (with sample data)"
	@echo "  make platform          - Start platform (upload your own data)"
	@echo ""
	@echo "Service Management:"
	@echo "  make start             - Start existing services (no rebuild)"
	@echo "  make restart           - Restart platform containers (preserves data)"
	@echo "  make restart-arranger  - Restart the arranger service only"
	@echo "  make rebuild           - Rebuild and redeploy stage only"
	@echo "  make down              - Gracefully shutdown all containers"
	@echo "  make status            - Show status of all services"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup            - Back up PostgreSQL database"
	@echo "  make check-space       - Check Docker disk usage"
	@echo ""
	@echo "Danger Zone:"
	@echo "  make reset             - DANGER: Remove all containers and volumes (DATA LOSS)"
	@echo "  make nuke              - DANGER: Complete cleanup including images"
	@echo ""
	@echo "  make help              - Show this help message"
	@echo "==========================================================="

# Run pre-deployment checks
phase0:
	@echo "Running Pre-deployment checks..."
	chmod +x ./setup/scripts/deployments/phase0.sh
	./setup/scripts/deployments/phase0.sh

# Start demo deployment (populates portal with data for you)
demo: phase0
	@if [ "$(STAGE_PORT)" = "3001" ]; then \
		printf "\033[1;33m⚠  Port 3000 is occupied — Stage will start on port 3001 instead\033[0m\n"; \
	else \
		printf "\033[1;36mStage will start on port 3000\033[0m\n"; \
	fi
	@echo ""
	@printf "\033[1;33mBuilding portal UI (stage) image (this may take a couple minutes)...\033[0m\n"
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
	@printf "\033[1;32mStage Portal UI built\033[0m\n"
	@echo ""
	@STAGE_PORT=$(STAGE_PORT) PROFILE=demo docker compose --progress quiet -f ./docker-compose.yml --profile demo up --attach setup

# Start platform services without data upload (user uploads their own data via conductor)
platform: phase0
	@if [ "$(STAGE_PORT)" = "3001" ]; then \
		printf "\033[1;33m⚠  Port 3000 is occupied — Stage will start on port 3001 instead\033[0m\n"; \
	else \
		printf "\033[1;36mStage will start on port 3000\033[0m\n"; \
	fi
	@echo ""
	@printf "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m\n"
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
	@printf "\033[1;32mStage Portal UI built\033[0m\n"
	@echo ""
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose --progress quiet -f ./docker-compose.yml --profile platform up --attach setup

# Start existing services without rebuild
start:
	@echo "Starting services..."
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose --profile platform up -d
	@printf "\033[1;32m✓ Services started\033[0m\n"

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	PROFILE=default docker compose -f ./docker-compose.yml --profile default down

# Restart platform containers and run deployment scripts
restart:
	@echo "Restarting platform containers..."
	@PROFILE=platform docker compose -f ./docker-compose.yml --profile platform down
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose --progress quiet -f ./docker-compose.yml --profile platform up --attach setup

# Restart only the arranger service
restart-arranger:
	@echo "Restarting arranger-datatable1..."
	@docker compose -f ./docker-compose.yml restart arranger-datatable1
	@printf "\033[1;32m✓ arranger-datatable1 restarted\033[0m\n"

# Show status of all services
status:
	@PROFILE=platform docker compose ps

# Rebuild and redeploy stage service only
rebuild:
	@echo "Stopping stage service..."
	@PROFILE=platform docker compose stop stage
	@echo "Rebuilding stage image..."
	@PROFILE=platform docker compose build --no-cache stage
	@echo "Starting stage service..."
	@PORT=$$(bash -c '(echo > /dev/tcp/localhost/3000) 2>/dev/null && echo 3001 || echo 3000'); \
	STAGE_PORT=$$PORT PROFILE=platform docker compose --profile platform up -d --no-deps stage; \
	printf "\033[1;32m✓ Stage rebuilt and redeployed — http://localhost:$$PORT\033[0m\n"

# Back up PostgreSQL database
backup:
	@chmod +x ./setup/scripts/backup.sh
	@./setup/scripts/backup.sh

# Check disk usage for volumes and containers
check-space:
	@printf "\033[1;33m=== Docker System Overview ===\033[0m\n"
	@docker system df
	@echo ""
	@printf "\033[1;33m=== Project Volumes ===\033[0m\n"
	@docker volume ls --filter name=prelude
	@echo ""
	@printf "\033[1;33m=== Available Disk Space ===\033[0m\n"
	@df -h . | tail -1

# Shutdown all containers and remove all volumes (Deletes all data)
reset:
	@echo ""
	@printf "\033[1;31m╔════════════════════════════════════════════════════════════╗\033[0m\n"
	@printf "\033[1;31m║                        DANGER ZONE                         ║\033[0m\n"
	@printf "\033[1;31m╚════════════════════════════════════════════════════════════╝\033[0m\n"
	@echo ""
	@echo "This will permanently delete:"
	@echo "  • All Docker containers"
	@echo "  • All Docker volumes (Elasticsearch, Stage, PostgreSQL)"
	@echo ""
	@printf "\033[1;33mData size to be removed:\033[0m\n"
	@docker system df -v 2>/dev/null | grep prelude | awk '{print "  " $$1 ": " $$3}' || true
	@echo ""
	@printf "\033[1;33m⚠️  BACKUP REMINDER:\033[0m\n"
	@echo "  Before proceeding, ensure you have backed up your data:"
	@echo "  \$$$ docker exec postgres pg_dump -U admin -Fc overtureDb > backup.dump"
	@echo ""
	@read -p "Type 'DELETE' to confirm permanent data deletion: " confirm; \
	if [ "$$confirm" = "DELETE" ]; then \
		echo ""; \
		printf "\033[1;33mShutting down containers and removing volumes...\033[0m\n"; \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v; \
		echo ""; \
		printf "\033[1;32m✓ Reset complete. All data has been removed.\033[0m\n"; \
	else \
		echo ""; \
		printf "\033[1;32mReset cancelled. No data was deleted.\033[0m\n"; \
	fi

# Complete cleanup: remove containers, volumes, AND images
nuke:
	@printf "\033[1;31mDANGER:\033[0m This will remove all containers, volumes, AND Docker images.\n"
	@echo "This is the most destructive option and will require a full rebuild on next start."
	@read -p "Are you absolutely sure? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "Nuking everything..."; \
		PROFILE=default docker compose -f ./docker-compose.yml --profile default down -v --rmi all; \
		printf "\n\033[1;32mCleanup finished. All Docker resources removed.\033[0m\n"; \
	else \
		echo "Operation cancelled"; \
	fi

.PHONY: help phase0 demo platform start down restart restart-arranger status rebuild backup check-space reset nuke
