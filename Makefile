phaseOne:
	docker compose -f ./phase1/docker-compose.phase1.yml up --attach conductor

phaseTwo:
	docker compose -f ./phase2/docker-compose.phase2.yml up --attach conductor

down:
	@if [ -n "$$(docker compose -f ./phase1/docker-compose.phase1.yml ps -q)" ]; then \
		echo "Stopping Phase One..."; \
		docker compose -f ./phase1/docker-compose.phase1.yml down -v; \
	elif [ -n "$$(docker compose -f ./phase2/docker-compose.phase2.yml ps -q)" ]; then \
		echo "Stopping Phase Two..."; \
		docker compose -f ./phase2/docker-compose.phase2.yml down -v; \
	else \
		echo "No running services found"; \
	fi

clean:
	@echo "\033[31mWARNING: This will remove all data within Elasticsearch.\033[0m"
	@echo "Are you sure you want to proceed? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "Stopping related containers..."
	docker compose -f docker-compose.phase1.yml down || true
	@echo "Cleaning up Elasticsearch volumes..."
	-rm -rf ./phase1/persistentStorage/es-volumes/*/data/nodes 2>/dev/null || true
	-find ./phase1/persistentStorage/es-volumes/*/logs -type f ! -name 'logs.txt' -delete 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-data 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-logs 2>/dev/null || true
	@echo "Cleanup completed!"
