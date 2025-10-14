#!/bin/bash

# Script to monitor for browser open signal from Docker container
# This runs on the host machine and watches for the signal file

SIGNAL_FILE="./setup/volumes/health/open_browser_signal"
MAX_WAIT=300  # Maximum wait time in seconds (5 minutes)
CHECK_INTERVAL=2  # Check every 2 seconds

echo "Monitoring for deployment completion..."
elapsed=0

while [ $elapsed -lt $MAX_WAIT ]; do
    if [ -f "$SIGNAL_FILE" ]; then
        # Read the URL from the signal file
        URL=$(cat "$SIGNAL_FILE" | grep "OPEN_BROWSER:" | cut -d':' -f2-)

        if [ -n "$URL" ]; then
            # Remove the signal file
            rm "$SIGNAL_FILE"

            # Open browser based on OS
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                open "$URL"
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Linux
                if command -v xdg-open > /dev/null; then
                    xdg-open "$URL"
                elif command -v gnome-open > /dev/null; then
                    gnome-open "$URL"
                fi
            elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
                # Windows
                start "$URL"
            fi

            exit 0
        fi
    fi

    sleep $CHECK_INTERVAL
    elapsed=$((elapsed + CHECK_INTERVAL))
done

echo "Timeout waiting for deployment signal."
exit 1
