#!/bin/sh
 
        # Checking first arranger server
        echo -e "Checking if our Arrangers are reachable"
        until curl -s -o /dev/null -w "%{http_code}" "http://arranger-demo:5050/graphql" | tr -d '/' | grep -q "200"; do
          echo -e "\033[1;36mDemo Data Arranger:\033[0m Not yet reachable, checking again in 20 seconds"
          sleep 20
        done
        echo -e "\033[1;32mSuccess:\033[0m Arranger Demo is now reachable"
