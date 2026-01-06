.DEFAULT_GOAL := help

help:
	@echo "================ Demo Commands ===================="
	@echo ""
	@echo "Development Environments:"
	@echo "  make demo       - Start demo deployment (with data)"
	@echo "  make start          - Start existing services (no rebuild)"
	@echo "  make restart        - Restart all services (preserves data)"
	@echo "  make down           - Stop all services (preserves data)"
	@echo "  make status         - Show status of all services"
	@echo ""
	@echo "Service Management:"
	@echo "  make rebuild  - Rebuild and redeploy stage only"
	@echo "  make check-space    - Check disk usage"
	@echo ""
	@echo "Danger Zone:"
	@echo "  make reset          - Remove ALL containers and data"
	@echo ""
	@echo "==========================================================="

# Run pre-deployment checks
phase0:
	@echo "Running Pre-deployment checks..."
	chmod +x ./apps/setup/scripts/services/utils/pre_deployment_check.sh
	./apps/setup/scripts/services/utils/pre_deployment_check.sh

# Start demo deployment (populates portal with data for you)
demo: phase0
	@echo ""
	@echo "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m"
	@echo ""
	@echo ""
	@echo ""
	@PROFILE=demo docker compose build stage 2>&1 | { \
		line1=""; line2=""; line3=""; \
		while IFS= read -r line; do \
			line1="$$line2"; line2="$$line3"; line3="$$line"; \
			printf "\033[4A\033[2K\r\033[1;33mBuilding portal UI (stage) image (this may take a minute)....\033[0m\n"; \
			[ -n "$$line1" ] && printf "%.64s\n" "$$line1" || echo ""; \
			[ -n "$$line2" ] && printf "%.64s\n" "$$line2" || echo ""; \
			[ -n "$$line3" ] && printf "%.64s\n" "$$line3" || echo ""; \
		done; \
	}
	@echo ""
	@echo "\033[1;32mStage Portal UI built\033[0m"
	@echo ""
	@PROFILE=demo docker compose --profile demo up --attach setup 

# Start existing services without rebuild
start:
	@echo "Starting services..."
	@PROFILE=demo docker compose --profile demo up -d
	@echo "\033[1;32m✓ Services started\033[0m"

# Restart all services (preserves data)
restart:
	@echo "Stopping all services..."
	@PROFILE=demo docker compose --profile demo down
	@echo "Starting all services..."
	@PROFILE=demo docker compose --profile demo up --attach setup

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	@PROFILE=demo docker compose --profile demo down

# Show status of all services
status:
	@PROFILE=demo docker compose ps

# Rebuild and redeploy stage service only
rebuild:
	@echo "Stopping stage service..."
	@PROFILE=demo docker compose stop stage
	@echo "Rebuilding stage image..."
	@PROFILE=demo docker compose build --no-cache stage
	@echo "Starting stage service..."
	@PROFILE=demo docker compose up -d stage
	@echo "\033[1;32m✓ Stage rebuilt and redeployed\033[0m"

# Check disk usage for volumes and containers
check-space:
	@echo "\033[1;33m=== Docker System Overview ===\033[0m"
	@docker system df
	@echo ""
	@echo "\033[1;33m=== Project Volumes ===\033[0m"
	@docker volume ls --filter name=prelude || echo "No project volumes found"
	@echo ""
	@echo "\033[1;33m=== Available Disk Space ===\033[0m"
	@df -h . | tail -1

# Shutdown all containers and remove all volumes (Deletes all data)
reset:
	@echo ""
	@echo "\033[1;31m╔════════════════════════════════════════════════════════════╗\033[0m"
	@echo "\033[1;31m║                        DANGER ZONE                         ║\033[0m"
	@echo "\033[1;31m╚════════════════════════════════════════════════════════════╝\033[0m"
	@echo ""
	@echo "This will permanently delete:"
	@echo "  • All Docker containers"
	@echo "  • All Docker volumes (Elasticsearch, Maestro, Stage, Song DB)"
	@echo ""
	@echo "\033[1;33mData size to be removed:\033[0m"
	@docker volume ls --filter name=prelude --format "table {{.Name}}\t{{.Size}}" 2>/dev/null || true
	@echo ""
	@echo "\033[1;33m⚠️  BACKUP REMINDER:\033[0m"
	@echo "  Before proceeding, ensure you have backed up your data:"
	@echo "  \$$$ docker exec song-db pg_dump -U admin -Fc songDb > backup.dump"
	@echo ""
	@read -p "Type 'DELETE' to confirm permanent data deletion: " confirm; \
	if [ "$$confirm" = "DELETE" ]; then \
		echo ""; \
		echo "\033[1;33mShutting down containers and removing volumes...\033[0m"; \
		PROFILE=demo docker compose --profile demo down -v; \
		echo ""; \
		echo "\033[1;32m✓ Reset complete. All data has been removed.\033[0m"; \
	else \
		echo ""; \
		echo "\033[1;32mReset cancelled. No data was deleted.\033[0m"; \
	fi

.PHONY: help phase0 demo start restart down status rebuild check-space reset

