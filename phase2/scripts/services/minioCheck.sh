#!/bin/sh

until [ "$(curl -s -o /dev/null -w "%{http_code}" "http://minio:9000/minio/health/live")" = "200" ]; do
    echo -e "\033[1;36mMinio:\033[0m Not yet reachable, checking again in 15 seconds"
    sleep 15
done
echo -e "\033[1;32mSuccess:\033[0m Minio is reachable"
