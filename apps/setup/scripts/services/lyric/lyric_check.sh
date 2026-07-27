#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Lyric:
1. Verify Lyric service is running
2. Check network connectivity
3. Confirm correct Lyric URL
4. Ensure firewall is not blocking connections
5. Review Lyric service logs
6. Check system resource availability
7. Verify application configuration
"

printf "\033[1;36mSetup:\033[0m Checking if Lyric is healthy\n"

until response=$(curl -s --max-time "$TIMEOUT" "$LYRIC_URL/health" -H "accept: */*" 2>/dev/null); do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n\033[1;31mError:\033[0m Failed to connect to Lyric after %d attempts\n" "$MAX_RETRIES"
        
        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        
        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Lyric URL: %s\n" "$LYRIC_URL"
        
        exit 1
    fi
    
    printf "\033[1;36mLyric:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done

# Check if response contains message OK
if echo "$response" | grep -q '"message":"OK"' 2>/dev/null; then
    printf "\033[1;32mSuccess:\033[0m Lyric is healthy\n"
else
    printf "\n\033[1;31mError:\033[0m Lyric returned unhealthy status\n"
    
    # Print troubleshooting tips
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    # Additional debug information
    printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
    printf "Lyric URL: %s\n" "$LYRIC_URL"
    printf "Health Response: %s\n" "$response"
    
    exit 1
fi