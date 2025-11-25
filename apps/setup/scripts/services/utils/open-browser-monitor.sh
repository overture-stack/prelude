#!/bin/bash

# Script to monitor for browser open signal from Docker container
# This runs on the host machine and watches for the signal file

# Use absolute path to prevent path traversal
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SIGNAL_FILE="$PROJECT_ROOT/setup/volumes/health/open_browser_signal"

MAX_WAIT=300  # Maximum wait time in seconds (5 minutes)
CHECK_INTERVAL=2  # Check every 2 seconds

# Validate URL format - only allow http/https on localhost
validate_url() {
    local url="$1"

    # Only allow http:// or https:// URLs
    if [[ ! "$url" =~ ^https?:// ]]; then
        echo "Invalid URL protocol. Only http:// and https:// are allowed." >&2
        return 1
    fi

    # Only allow localhost or 127.0.0.1
    if [[ ! "$url" =~ ^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?(/.*)?$ ]]; then
        echo "Invalid URL. Only localhost URLs are allowed." >&2
        return 1
    fi

    # Check for command injection attempts (semicolons, pipes, backticks, etc.)
    local dangerous_chars=';|`$()&<>{}[]'
    if [[ "$url" =~ [$dangerous_chars] ]]; then
        echo "Invalid URL. Contains forbidden characters." >&2
        return 1
    fi

    return 0
}

# Safely open browser
safe_open_browser() {
    local url="$1"

    # Validate URL before opening
    if ! validate_url "$url"; then
        echo "Refusing to open invalid or potentially dangerous URL: $url" >&2
        return 1
    fi

    # Open browser based on OS - use quotes to prevent injection
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - using -- to prevent URL being interpreted as option
        open -- "$url" 2>/dev/null
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open > /dev/null; then
            xdg-open -- "$url" 2>/dev/null
        elif command -v gnome-open > /dev/null; then
            gnome-open -- "$url" 2>/dev/null
        fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        cmd.exe /c start "" "$url" 2>/dev/null
    fi
}

echo "Monitoring for deployment completion..."
elapsed=0

while [ $elapsed -lt $MAX_WAIT ]; do
    if [ -f "$SIGNAL_FILE" ]; then
        # Read the URL from the signal file securely
        # Use head to limit read size and prevent DoS
        URL=$(head -n 1 "$SIGNAL_FILE" 2>/dev/null | grep "OPEN_BROWSER:" | cut -d':' -f2-)

        # Trim whitespace
        URL=$(echo "$URL" | xargs)

        if [ -n "$URL" ]; then
            # Remove the signal file first (before opening browser)
            rm -f "$SIGNAL_FILE" 2>/dev/null

            # Open browser safely (silently)
            safe_open_browser "$URL" >/dev/null 2>&1

            exit 0
        fi
    fi

    sleep $CHECK_INTERVAL
    elapsed=$((elapsed + CHECK_INTERVAL))
done

# Silent timeout - deployment may have completed successfully
exit 0
