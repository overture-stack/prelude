#!/bin/sh

RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=30          
TIMEOUT=10              

printf "\033[1;36mConductor:\033[0m Checking if Maestro File is reachable (this may take a few minutes)\n"

until response=$(curl -s --max-time "$TIMEOUT" "${MAESTRO_FILE_URL}" -H "accept: */*" 2>/dev/null); do
   RETRY_COUNT=$((RETRY_COUNT + 1))
   
   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "\033[1;31mFailed to connect to Maestro File after %d attempts\033[0m\n" "$MAX_RETRIES"
       exit 1
   fi
   
   printf "\033[1;36mMaestro File:\033[0m Not yet reachable, checking again in %d seconds\n" "$RETRY_DELAY"
   sleep "$RETRY_DELAY"
done

if echo "$response" | grep -q '"status":"up"'; then
   printf "\033[1;32mSuccess:\033[0m Maestro File is now reachable\n"
else
   printf "\033[1;31mError:\033[0m Maestro File returned unexpected status: $response\n"
   exit 1
fi
