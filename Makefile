.PHONY: platform down clean

platform:
	docker compose -f docker-compose.yml up --attach conductor

down:
	docker compose down

clean:
	@echo "\033[31mWARNING: This will remove all data within Elasticsearch.\033[0m"
	@/bin/bash -c 'echo "Are you sure you want to proceed? [y/N] " && read ans && [ $${ans:-N} = y ] && (\
		echo "Stopping related containers..." && \
		docker compose -f docker-compose.yml down || true && \
		echo "Cleaning up Elasticsearch volumes..." && \
		rm -rf ./volumes/es-data/nodes 2>/dev/null || true && \
		find ./volumes/es-logs/ -type f ! -name "logs.txt" -delete 2>/dev/null || true && \
		docker volume rm -f conductor_elasticsearch-data 2>/dev/null || true && \
		docker volume rm -f conductor_elasticsearch-logs 2>/dev/null || true && \
		echo "Cleanup completed!" \
	)'
