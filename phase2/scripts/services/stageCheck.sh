#!/bin/sh

# Check Stage
echo -e "Checking if Stage is reachable"
    until curl -s -o /dev/null -w "%{http_code}" "http://stage:3000" | grep -q "200"; do
        echo -e "\033[1;36mStage:\033[0m Not yet reachable, checking again in 10 seconds"
        sleep 10
    done
echo -e "\033[1;32mSuccess:\033[0m Stage is now reachable"
