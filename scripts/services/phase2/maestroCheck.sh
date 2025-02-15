#!/bin/sh

RETRY_COUNT=3
MAX_RETRIES=10          
RETRY_DELAY=30          
TIMEOUT=10              
DEBUG=false  

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "\033[1;33mDEBUG:\033[0m %s\n" "$1"
    fi
}

# Clean URL function - removes any double slashes except for http://
clean_url() {
    echo "$1" | sed 's#([^:])//+#\1/#g'
}

# Construct health check URL
HEALTH_URL="$MAESTRO_URL/health"
HEALTH_URL=$(clean_url "$HEALTH_URL")

debug "Using MAESTRO_URL: $MAESTRO_URL"
debug "Constructed health URL: $HEALTH_URL"

printf "\033[1;36mConductor:\033[0m Checking if service is reachable\n"

until response=$(curl -s --max-time "$TIMEOUT" "$HEALTH_URL" -H "accept: */*" 2>/dev/null); do
    debug "Curl command: curl -s --max-time $TIMEOUT $HEALTH_URL -H 'accept: */*'"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\033[1;31mFailed to connect after %d attempts\033[0m\n" "$MAX_RETRIES"
        exit 1
    fi
    
    printf "\033[1;36mService:\033[0m Not yet reachable, checking again in %d seconds\n" "$RETRY_DELAY"
    debug "Attempt $RETRY_COUNT failed. Retrying in $RETRY_DELAY seconds"
    sleep "$RETRY_DELAY"
done

debug "Received response: $response"

if echo "$response" | grep -q '"message":"OK"'; then
    printf "\033[1;32mSuccess:\033[0m Service is healthy\n"
else
    printf "\033[1;31mError:\033[0m Service returned unexpected status: %s\n" "$response"
    # If response is HTML, format it nicely
    if echo "$response" | grep -q '<!DOCTYPE html>'; then
        echo "$response" | sed 's/conductor  | //g'
    fi
    debug "Response did not contain expected 'message':'OK'"
    exit 1
fi