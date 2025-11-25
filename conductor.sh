#!/bin/sh
# conductor - Global CLI Wrapper
# Runs the main.js file inside the project's dist folder

# Change this path to the absolute path where your dist folder lives
PROJECT_PATH="/data/softEng/ddp-v4.0-beta/apps/conductor/"
MAIN_JS="$PROJECT_PATH/dist/main.js"

# Ensure the file exists
if [ ! -f "$MAIN_JS" ]; then
  echo "Error: main.js not found at $MAIN_JS"
  exit 1
fi

# Pass all arguments through to Node
node "$MAIN_JS" "$@"
