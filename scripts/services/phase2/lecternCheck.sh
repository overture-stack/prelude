#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              

printf "\033[1;36mConductor:\033[0m Checking if Lectern is healthy\n"

until response=$(curl -s --max-time "$TIMEOUT" "$LECTERN_URL/health" -H "accept: */*" 2>/dev/null); do
   RETRY_COUNT=$((RETRY_COUNT + 1))
   
   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "\033[1;31mFailed to connect to Lectern after %d attempts\033[0m\n" "$MAX_RETRIES"
       exit 1
   fi
   
   printf "\033[1;36mLectern:\033[0m Not yet healthy, checking again in %d seconds\n" "$RETRY_DELAY"
   sleep "$RETRY_DELAY"
done

# Check if app status is Up
if echo "$response" | grep -q '"appStatus":"Up"' 2>/dev/null; then
   printf "\033[1;32mSuccess:\033[0m Lectern is healthy\n"
else
   printf "\033[1;31mError:\033[0m Lectern returned unhealthy status\n"
   exit 1
fi