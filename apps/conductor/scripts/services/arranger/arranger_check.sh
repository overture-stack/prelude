#!/bin/bash
# /conductor/scripts/services/arranger/arranger_check.sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=20
TIMEOUT=10

# Tip section - can be updated with specific troubleshooting steps
TROUBLESHOOTING_TIPS="
Troubleshooting Tips:
1. Verify Arranger service is running
2. Check network connectivity
3. Confirm correct Arranger URLs
4. Ensure firewall is not blocking connections
5. Review Arranger service logs for specific errors
"

# Function to parse host and port from URL
parse_url() {
    local url="$1"
    local regex='http://([^:/]+)(:([0-9]+))?'
    if echo "$url" | grep -qE "$regex"; then
        host=$(echo "$url" | sed -E "s|$regex|\1|")
        port=$(echo "$url" | sed -E "s|$regex|\3|" || echo "5050")
    else
        printf "\033[1;31mError:\033[0m Invalid ARRANGER_URL format: %s\n" "$url"
        return 1
    fi
}

# Check Arranger instances based on ARRANGER_COUNT and related environment variables
check_arrangers() {
    # Get the number of Arranger instances to check
    arranger_count=${ARRANGER_COUNT:-0}
    
    printf "\033[1;36mConductor:\033[0m Checking %d Arranger instances\n" "$arranger_count"
    
    i=0
    while [ "$i" -lt "$arranger_count" ]; do
        # Dynamically retrieve the URL for this instance
        arranger_url_var="ARRANGER_${i}_URL"
        arranger_url=$(eval "echo \$$arranger_url_var")
        
        # Skip if no URL
        if [ -z "$arranger_url" ]; then
            printf "\033[1;31mError:\033[0m No URL found for Arranger instance %d\n" "$i"
            exit 1
        fi
        
        # Parse URL
        if ! parse_url "$arranger_url"; then
            exit 1
        fi
        
        printf "\033[1;36mChecking Arranger:\033[0m Instance %d at %s\n" "$i" "$arranger_url"
        
        # Check if Arranger is responsive with multiple retries
        RETRY_COUNT=0
        until response=$(curl -s --max-time "$TIMEOUT" "$arranger_url" 2>/dev/null); do
            RETRY_COUNT=$((RETRY_COUNT + 1))
            
            if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
                printf "\033[1;31mError:\033[0m Arranger instance %d is not available after %d attempts\n" "$i" "$MAX_RETRIES"
                printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
                exit 1
            fi
            
            printf "\033[1;36mInfo:\033[0m Attempt %d: Arranger instance %d not ready, retrying in %d seconds\n" "$RETRY_COUNT" "$i" "$RETRY_DELAY"
            sleep "$RETRY_DELAY"
        done
        
        printf "\033[1;36mInfo:\033[0m Arranger instance %d is available\n" "$i"
        
        i=$((i + 1))
    done
    
    printf "\033[1;32mSuccess:\033[0m All Arranger instances are available\n"
    exit 0
}

# Run the check
check_arrangers