phaseOne:
	docker compose -f docker-compose.phaseOne.yml up --attach conductor

phaseTwo:
	docker compose -f docker-compose.phaseTwo.yml up --attach conductor

down:
	@if [ -n "$$(docker compose -f docker-compose.phaseOne.yml ps -q)" ]; then \
		echo "Stopping Phase One..."; \
		docker compose -f docker-compose.phaseOne.yml down -v; \
	elif [ -n "$$(docker compose -f docker-compose.phaseTwo.yml ps -q)" ]; then \
		echo "Stopping Phase Two..."; \
		docker compose -f docker-compose.phaseTwo.yml down -v; \
	else \
		echo "No running services found"; \
	fi

clean:
	@echo "\033[31mWARNING: This will remove all data within Elasticsearch.\033[0m"
	@echo "Are you sure you want to proceed? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "Stopping related containers..."
	docker compose -f docker-compose.phaseOne.yml down || true
	@echo "Cleaning up Elasticsearch volumes..."
	-rm -rf ./persistentStorage/es-volumes/*/data/nodes 2>/dev/null || true
	-find ./persistentStorage/es-volumes/*/logs -type f ! -name 'logs.txt' -delete 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-data 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-logs 2>/dev/null || true
	@echo "Cleanup completed!"

.PHONY: phaseOne phaseTwo down clean