#!/bin/sh
 
         echo -e "Checking if our Arrangers are reachable"
        until curl -s -o /dev/null -w "%{http_code}" "http://arranger-correlation:5050/graphql" | tr -d '/' | grep -q "200"; do
          echo -e "\033[1;36mCorrelation Data Arranger:\033[0m Not yet reachable, checking again in 20 seconds"
          sleep 20
        done
        echo -e "\033[1;32mSuccess:\033[0m Arranger Correlation is now reachable"
        until curl -s -o /dev/null -w "%{http_code}" "http://arranger-mutation:5051/graphql" | tr -d '/' | grep -q "200"; do
          echo -e "\033[1;36mMutation Data Arranger:\033[0m Not yet reachable, checking again in 20 seconds"
          sleep 20
        done
        echo -e "\033[1;32mSuccess:\033[0m Arranger Mutation is now reachable"
        until curl -s -o /dev/null -w "%{http_code}" "http://arranger-mrna:5052/graphql" | tr -d '/' | grep -q "200"; do
          echo -e "\033[1;36mMRNA Data Arranger:\033[0m Not yet reachable, checking again in 20 seconds"
          sleep 20
        done
        echo -e "\033[1;32mSuccess:\033[0m Arranger MRNA is now reachable"
        until curl -s -o /dev/null -w "%{http_code}" "http://arranger-protein:5053/graphql" | tr -d '/' | grep -q "200"; do
          echo -e "\033[1;36mProtein Data Arranger:\033[0m Not yet reachable, checking again in 20 seconds"
          sleep 20
        done
        echo -e "\033[1;32mSuccess:\033[0m Arranger Protein is now reachable"
        echo -e "\033[1;32mSuccess:\033[0m All Arrangers are now reachable"
