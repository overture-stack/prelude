#!/bin/sh

# If the health check file exists on startup it needs to be removed
rm setup/volumes/health/setup_health 2>/dev/null 