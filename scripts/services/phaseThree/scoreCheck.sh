#!/bin/sh

# Check for Score
until [ "$(curl -s -o /dev/null -w "%{http_code}" "http://score:8087/download/ping" -H "accept: */*" -H "Authorization: 68fb42b4-f1ed-4e8c-beab-3724b99fe528" -H "User-Agent: unknown")" = "200" ]; do
    echo -e "\033[1;36mScore:\033[0m Not yet reachable, checking again in 20 seconds"
    sleep 20
done
echo -e "\033[1;32mSuccess:\033[0m Score is now reachable"
