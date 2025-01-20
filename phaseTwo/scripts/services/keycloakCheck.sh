#!/bin/sh

# Check for Keycloak
until [ "$(curl -s -o /dev/null -w "%{http_code}" "http://keycloak:8080/health/live")" = "200" ]; do
    echo -e "\033[1;36mKeycloak:\033[0m Not yet reachable, checking again in 30 seconds"
    sleep 30
done
echo -e "\033[1;32mSuccess:\033[0m Keycloak is reachable"
