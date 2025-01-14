platform:
	PROFILE=platform docker compose --profile platform up --attach conductor

down:
	PROFILE=platform docker compose --profile platform down

clean:
	@echo "\033[31mWARNING: This will remove all data within Elasticsearch.\033[0m"
	@echo "Are you sure you want to proceed? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "Stopping related containers..."
	PROFILE=platform docker compose --profile platform down
	@echo "Cleaning up Elasticsearch volumes..."
	-rm -rf ./persistentStorage/es-volumes/es-data/nodes 2>/dev/null || true
	-find ./persistentStorage/es-volumes/es-logs -type f ! -name 'logs.txt' -delete 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-data 2>/dev/null || true
	-docker volume rm -f conductor_elasticsearch-logs 2>/dev/null || true
	@echo "Cleanup completed!"