#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Lectern:
1. Verify Lectern service is running
2. Check network connectivity
3. Confirm correct Lectern URL
4. Ensure firewall is not blocking connections
5. Review Lectern service logs
6. Check system resource availability
7. Verify application configuration
"

# Validate Lectern URL
if [ -z "$LECTERN_URL" ]; then
    printf "\n\033[1;31mError:\033[0m LECTERN_URL environment variable is not set\n"
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    printf "\n\033[1;33mConfiguration Requirements:\033[0m\n"
    printf "- LECTERN_URL must be set to the base URL of the Lectern service\n"
    printf "- Example: export LECTERN_URL=http://lectern:8080\n"
    
    exit 1
fi

# Validate URL format
if ! echo "$LECTERN_URL" | grep -qE '^https?://[^/]+'; then
    printf "\n\033[1;31mError:\033[0m Invalid LECTERN_URL format\n"
    printf "\n\033[1;33mURL Format Requirements:\033[0m\n"
    printf "- Must start with http:// or https://\n"
    printf "- Must include hostname\n"
    printf "- Current value: %s\n" "$LECTERN_URL"
    
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    exit 1
fi

printf "\033[1;36mSetup:\033[0m Checking if Lectern is healthy\n"

until response=$(curl -s --max-time "$TIMEOUT" "$LECTERN_URL/health" -H "accept: */*" 2>/dev/null); do
   RETRY_COUNT=$((RETRY_COUNT + 1))
   
   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "\n\033[1;31mError:\033[0m Failed to connect to Lectern after %d attempts\n" "$MAX_RETRIES"
       
       # Print troubleshooting tips
       printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
       
       # Additional debug information
       printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
       printf "Lectern URL: %s\n" "$LECTERN_URL"
       
       exit 1
   fi
   
   printf "\033[1;36mLectern:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
   sleep "$RETRY_DELAY"
done

# Check if app status is Up
if echo "$response" | grep -q '"appStatus":"Up"' 2>/dev/null; then
   printf "\033[1;32mSuccess:\033[0m Lectern is healthy\n"
else
   printf "\n\033[1;31mError:\033[0m Lectern returned unhealthy status\n"
   
   # Print troubleshooting tips
   printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
   
   # Additional debug information
   printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
   printf "Lectern URL: %s\n" "$LECTERN_URL"
   printf "Health Response: %s\n" "$response"
   
   exit 1
fi