#!/bin/sh
 
# Check Maestro
echo -e "Checking if Maestro is reachable (this may take a few minutes)" 
until curl -s -X POST "http://maestro:11235/index/repository/song.overture/study/demo" -H "accept: */*" -d "{}" | grep -q "true"; do
    echo -e "\033[1;36mMaestro:\033[0m Not yet reachable, checking again in 30 seconds"
    sleep 30
done
echo -e "\033[1;32mSuccess:\033[0m Maestro is now reachable"
