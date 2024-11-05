#!/bin/sh
 
echo -e "Checking if Arranger is reachable"
  until curl -s -o /dev/null -w "%{http_code}" "http://arranger-server:5050/graphql" | grep -q "200"; do
    echo -e "\033[1;36mArranger:\033[0m Not yet reachable, checking again in 20 seconds"
    sleep 20
  done
echo -e "\033[1;32mSuccess:\033[0m Arranger is now reachable"
