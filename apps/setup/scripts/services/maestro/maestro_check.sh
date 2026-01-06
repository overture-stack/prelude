#!/bin/bash

# Define some basic configurations
RETRY_COUNT=3
MAX_RETRIES=10          
RETRY_DELAY=30          
TIMEOUT=10              
DEBUG=${DEBUG:-false}

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Maestro:
1. Verify Maestro service is running
2. Check network connectivity
3. Confirm correct Maestro URL
4. Ensure firewall is not blocking connections
5. Review Maestro service logs
6. Check system resource availability
7. Verify application configuration
"

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "   └─ \033[1;33mDEBUG:\033[0m %s\n" "$1"
    fi
}

# Validate Maestro URL
if [ -z "$MAESTRO_URL" ]; then
    printf "   └─ \033[1;31mError:\033[0m MAESTRO_URL environment variable is not set\n"
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    printf "\n\033[1;33mConfiguration Requirements:\033[0m\n"
    printf "- MAESTRO_URL must be set to the base URL of the Maestro service\n"
    printf "- Example: export MAESTRO_URL=http://maestro:8080\n"

    exit 1
fi

# Validate URL format
if ! echo "$MAESTRO_URL" | grep -qE '^https?://[^/]+'; then
    printf "   └─ \033[1;31mError:\033[0m Invalid MAESTRO_URL format\n"
    printf "\n\033[1;33mURL Format Requirements:\033[0m\n"
    printf "- Must start with http:// or https://\n"
    printf "- Must include hostname\n"
    printf "- Current value: %s\n" "$MAESTRO_URL"

    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    exit 1
fi

# Clean URL function - removes any double slashes except for http://
clean_url() {
    echo "$1" | sed 's#([^:])//+#\1/#g'
}

# Construct health check URL
HEALTH_URL="$MAESTRO_URL/health"
HEALTH_URL=$(clean_url "$HEALTH_URL")

debug "Using MAESTRO_URL: $MAESTRO_URL"
debug "Constructed health URL: $HEALTH_URL"

printf "   └─ \033[1;36mSetup:\033[0m Checking if Maestro is reachable\n"

until response=$(curl -s --max-time "$TIMEOUT" "$HEALTH_URL" -H "accept: */*" 2>/dev/null); do
    debug "Curl command: curl -s --max-time $TIMEOUT $HEALTH_URL -H 'accept: */*'"
    RETRY_COUNT=$((RETRY_COUNT + 1))

    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n   └─ \033[1;31mError:\033[0m Failed to connect to Maestro after %d attempts\n" "$MAX_RETRIES"

        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Maestro URL: %s\n" "$MAESTRO_URL"
        printf "Health URL: %s\n" "$HEALTH_URL"

        exit 1
    fi

    printf "   └─ \033[1;36mMaestro:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    debug "Attempt $RETRY_COUNT failed. Retrying in $RETRY_DELAY seconds"
    sleep "$RETRY_DELAY"
done

debug "Received response: $response"

if echo "$response" | grep -q '"message":"OK"'; then
    printf "   └─ \033[1;32mSuccess:\033[0m Maestro is healthy\n"
else
    printf "\n   └─ \033[1;31mError:\033[0m Maestro returned unexpected status\n"

    # Print troubleshooting tips
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    # Additional debug information
    printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
    printf "Maestro URL: %s\n" "$MAESTRO_URL"
    printf "Health URL: %s\n" "$HEALTH_URL"
    printf "Health Response: %s\n" "$response"

    # If response is HTML, format it nicely
    if echo "$response" | grep -q '<!DOCTYPE html>'; then
        echo "$response" | sed 's/conductor  | //g'
    fi

    debug "Response did not contain expected 'message':'OK'"
    exit 1
fi