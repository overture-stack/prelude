# Basic health check configuration
MAX_RETRIES=10
RETRY_COUNT=0
ES_AUTH="${ES_USER}:${ES_PASS}" 

# Check both authentication and cluster health
until curl -s -f -u $ES_AUTH "$ES_URL/_cluster/health?wait_for_status=yellow" > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "\033[1;31mError:\033[0m Elasticsearch failed to start after 5 minutes"
        echo -e "\033[1;31mDebug:\033[0m Attempting unauthenticated health check..."
        curl -s "$ES_URL/_cluster/health" || echo "Connection failed"
        exit 1
    fi
    echo -e "\033[1;36mElasticsearch:\033[0m Not yet reachable (attempt $RETRY_COUNT/$MAX_RETRIES), checking again in 30 seconds"
    sleep 30
done

echo -e "\033[1;32mSuccess:\033[0m Elasticsearch is reachable and ready"