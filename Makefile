SHELL := /bin/bash
.DEFAULT_GOAL := help

# Auto-detect Stage port: use 3001 if port 3000 is already occupied (e.g. Docusaurus)
STAGE_PORT := $(shell lsof -ti:3000 2>/dev/null | grep -q . && echo 3001 || echo 3000)

help:
	@echo "============= Overture Demo Makefile Commands ==========="
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
	@echo "Data Ingestion:"
	@echo "  make submit            - Load sample genomic data (run after make platform)"
	@echo "  make reindex           - Trigger Maestro to re-index all Song analyses"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup            - Back up Song database"
	@echo "  make check-space       - Check Docker disk usage"
	@echo ""
	@echo "Danger Zone:"
	@echo "  make reset             - DANGER: Remove all containers and volumes (DATA LOSS)"
	@echo "  make reset-song        - DANGER: Reset only Song database"
	@echo "  make nuke              - DANGER: Complete cleanup including images"
	@echo ""
	@echo "  make help              - Show this help message"
	@echo "========================================================"

# Run pre-deployment checks
phase0:
	@echo "Running Pre-deployment checks..."
	chmod +x ./apps/setup/scripts/deployments/phase0.sh
	./apps/setup/scripts/deployments/phase0.sh

# Start demo deployment (populates portal with data for you)
demo: phase0
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
	@./apps/setup/scripts/services/utils/open-browser-monitor.sh & STAGE_PORT=$(STAGE_PORT) PROFILE=demo docker compose -f ./docker-compose.yml --profile demo up --attach setup

# Start platform services without data upload (user uploads their own data)
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
	@./apps/setup/scripts/services/utils/open-browser-monitor.sh & STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose -f ./docker-compose.yml --profile platform up --attach setup

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
	@./apps/setup/scripts/services/utils/open-browser-monitor.sh & STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose -f ./docker-compose.yml --profile platform up --attach setup

# Restart only the arranger service
restart-arranger:
	@echo "Restarting arranger-file..."
	@docker compose -f ./docker-compose.yml restart arranger-file
	@printf "\033[1;32m✓ arranger-file restarted\033[0m\n"

# Show status of all services
status:
	@PROFILE=platform docker compose ps

# Rebuild and redeploy stage service only
rebuild:
	@echo "Stopping stage service..."
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose stop stage
	@echo "Rebuilding stage image..."
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose build --no-cache stage
	@echo "Starting stage service..."
	@STAGE_PORT=$(STAGE_PORT) PROFILE=platform docker compose --profile platform up -d --no-deps stage
	@printf "\033[1;32m✓ Stage rebuilt and redeployed — http://localhost:$(STAGE_PORT)\033[0m\n"

# Back up Song database
backup:
	@chmod +x ./apps/setup/scripts/backup.sh
	@./apps/setup/scripts/backup.sh

# Check disk usage for volumes and containers
check-space:
	@printf "\033[1;33m=== Docker System Overview ===\033[0m\n"
	@docker system df
	@echo ""
	@printf "\033[1;33m=== Project Volumes ===\033[0m\n"
	@docker volume ls --filter name=overture-demo
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
	@docker system df -v 2>/dev/null | grep overture-demo | awk '{print "  " $$1 ": " $$3}' || true
	@echo ""
	@printf "\033[1;33m⚠️  BACKUP REMINDER:\033[0m\n"
	@echo "  Before proceeding, ensure you have backed up your data:"
	@echo "  \$$$ docker exec song-db pg_dump -U admin -Fc songDb > backup.dump"
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

# Reset only Song's database (clears analyses/files so submissions can be retried from scratch)
reset-song:
	@printf "\033[1;33mResetting Song database (analyses and file registrations will be deleted)...\033[0m\n"
	@docker compose stop song song-db
	@docker compose rm -f song-db
	@docker volume rm overture-demo_song-database-data 2>/dev/null || true
	@docker compose up -d song-db
	@printf "\033[1;33mWaiting for song-db to be healthy...\033[0m\n"
	@until docker inspect --format='{{.State.Health.Status}}' song-db 2>/dev/null | grep -q healthy; do sleep 2; done
	@docker compose up -d song
	@printf "\033[1;32m✓ Song database reset. Run 'make platform' or restart Song to re-register schemas and study.\033[0m\n"

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

# Download files from Score using a manifest (usage: make download MANIFEST=path/to/manifest.txt)
download:
	$(eval MANIFEST ?= data/manifest.txt)
	$(eval OUTPUT_DIR ?= $(CURDIR)/downloads)
	$(eval NETWORK ?= overture-demo_platform-network)
	@if [ ! -f "$(MANIFEST)" ]; then \
		printf "\033[1;31mError:\033[0m Manifest not found: $(MANIFEST)\n"; \
		printf "Usage: make download MANIFEST=path/to/manifest.txt\n"; \
		exit 1; \
	fi
	@mkdir -p "$(OUTPUT_DIR)"
	@printf "\033[1;36mDownloading files from manifest:\033[0m $(MANIFEST)\n"
	@printf "\033[1;36mOutput directory:\033[0m $(OUTPUT_DIR)\n"
	@docker run --rm \
		--network "$(NETWORK)" \
		--platform linux/amd64 \
		-e ACCESSTOKEN="68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
		-e STORAGE_URL=http://score:8087 \
		-e METADATA_URL=http://song:8080 \
		-v "$(abspath $(MANIFEST)):/manifest.txt:ro" \
		-v "$(OUTPUT_DIR):/output" \
		ghcr.io/overture-stack/score-client:ee758b91 \
		bin/score-client download --manifest /manifest.txt --output-dir /output
	@printf "\033[1;32m✓ Download complete. Files saved to $(OUTPUT_DIR)\033[0m\n"

# Trigger Maestro to re-index all analyses from the song.overture repository
reindex:
	@chmod +x ./apps/setup/scripts/services/maestro/reindex.sh
	@./apps/setup/scripts/services/maestro/reindex.sh

# Submit sample genomic data to Song and Score (run after make platform)
submit:
	@chmod +x ./apps/setup/scripts/submit.sh
	@./apps/setup/scripts/submit.sh

.PHONY: help phase0 demo platform start down restart restart-arranger status rebuild backup check-space reset reset-song nuke reindex submit download
