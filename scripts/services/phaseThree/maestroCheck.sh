#!/bin/sh
 
# Check Maestro
echo -e "Checking if Maestro is reachable (this may take a few minutes)" 
until [ "$(curl -s "http://maestro-file:11235/" -H "accept: */*")" = '{"status":"up"}' ]; do
    echo -e "\033[1;36mMaestro:\033[0m Not yet reachable, checking again in 30 seconds"
    sleep 30
done
echo -e "\033[1;32mSuccess:\033[0m Maestro is now reachable"