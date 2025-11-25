.DEFAULT_GOAL := help

help:
	@echo "================ DDP Platform Commands ===================="
	@echo ""
	@echo "Development Environments:"
	@echo "  make platform       - Start platform deployment (with data)"
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
	chmod +x ./apps/setup/scripts/deployments/phase0.sh
	./apps/setup/scripts/deployments/phase0.sh 

# Start platform deployment (populates portal with data for you)
platform: phase0
	@echo ""
	@echo "\033[1;33mBuilding portal UI (stage) image (this may take a minute)...\033[0m"
	@echo ""
	@echo ""
	@echo ""
	@PROFILE=platform docker compose build stage 2>&1 | { \
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
	@PROFILE=platform docker compose --profile platform up --attach setup 

# Start existing services without rebuild
start:
	@echo "Starting services..."
	@PROFILE=platform docker compose --profile platform up -d
	@echo "\033[1;32m✓ Services started\033[0m"

# Restart all services (preserves data)
restart:
	@echo "Stopping all services..."
	@PROFILE=platform docker compose --profile platform down
	@echo "Starting all services..."
	@PROFILE=platform docker compose --profile platform up --attach setup

# Gracefully shutdown all containers while preserving volumes
down:
	@echo "Shutting down all running containers..."
	@PROFILE=default docker compose --profile default down

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
	@PROFILE=platform docker compose up -d stage
	@echo "\033[1;32m✓ Stage rebuilt and redeployed\033[0m"

# Check disk usage for volumes and containers
check-space:
	@echo "\033[1;33m=== Docker System Overview ===\033[0m"
	@docker system df
	@echo ""
	@echo "\033[1;33m=== Project Volumes ===\033[0m"
	@docker system df -v | grep ddp-v40-beta || echo "No project volumes found"
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
	@echo "  • All Docker volumes (Elasticsearch, Stage, PostgreSQL)"
	@echo ""
	@echo "\033[1;33mData size to be removed:\033[0m"
	@docker system df -v 2>/dev/null | grep ddp-v40-beta | awk '{print "  " $$1 ": " $$3}' || true
	@echo ""
	@echo "\033[1;33m⚠️  BACKUP REMINDER:\033[0m"
	@echo "  Before proceeding, ensure you have backed up your data:"
	@echo "  \$$$ docker exec postgres-platform pg_dump -U admin -Fc overtureDb > backup.dump"
	@echo ""
	@read -p "Type 'DELETE' to confirm permanent data deletion: " confirm; \
	if [ "$$confirm" = "DELETE" ]; then \
		echo ""; \
		echo "\033[1;33mShutting down containers and removing volumes...\033[0m"; \
		PROFILE=default docker compose --profile default down -v; \
		echo ""; \
		echo "\033[1;32m✓ Reset complete. All data has been removed.\033[0m"; \
	else \
		echo ""; \
		echo "\033[1;32mReset cancelled. No data was deleted.\033[0m"; \
	fi

.PHONY: help phase0 platform start restart down status rebuild check-space reset

