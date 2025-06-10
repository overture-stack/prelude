#!/bin/bash

# Cautious nginx setup script for Overture Prelude
# This script is designed to be safe when other sites are already configured

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SITE_NAME="overture-prelude"
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
LISTEN_PORT="8080"

echo -e "${BLUE}Setting up nginx configuration for Overture Prelude...${NC}"
echo ""

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root or with sudo${NC}"
   exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}nginx is not installed. Please install nginx first.${NC}"
    exit 1
fi

# Check if required files exist
required_files=("nginx.conf" "proxy_params" "portal")
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}Required file '$file' not found in current directory${NC}"
        exit 1
    fi
done

# Create backup directory
echo -e "${YELLOW}Creating backup directory: $BACKUP_DIR${NC}"
mkdir -p "$BACKUP_DIR"

# Function to backup file if it exists
backup_file() {
    local file_path="$1"
    local backup_name="$2"
    
    if [[ -f "$file_path" ]]; then
        echo -e "${YELLOW}Backing up existing $file_path${NC}"
        cp "$file_path" "$BACKUP_DIR/$backup_name"
        return 0
    fi
    return 1
}

# Check for port conflicts
echo -e "${BLUE}Checking for port conflicts on port $LISTEN_PORT...${NC}"
if netstat -tuln 2>/dev/null | grep -q ":$LISTEN_PORT "; then
    echo -e "${YELLOW}Warning: Port $LISTEN_PORT appears to be in use${NC}"
    echo "Continuing anyway - you may need to resolve conflicts manually"
fi

# Check if our site already exists
if [[ -f "/etc/nginx/sites-available/$SITE_NAME" ]]; then
    echo -e "${YELLOW}Site '$SITE_NAME' already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi
fi

# Create necessary directories
echo -e "${BLUE}Creating nginx directories...${NC}"
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Backup existing nginx.conf
backup_file "/etc/nginx/nginx.conf" "nginx.conf.backup"

# Check if nginx.conf includes sites-enabled
echo -e "${BLUE}Checking nginx.conf configuration...${NC}"
if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
    echo -e "${YELLOW}Current nginx.conf doesn't include sites-enabled directory${NC}"
    echo "This usually means nginx is using a different configuration structure"
    read -p "Do you want to replace nginx.conf with our version? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Replacing nginx.conf...${NC}"
        cp nginx.conf /etc/nginx/nginx.conf
    else
        echo -e "${YELLOW}Skipping nginx.conf replacement${NC}"
        echo "You may need to manually include the site configuration"
    fi
else
    echo -e "${GREEN}nginx.conf already includes sites-enabled${NC}"
fi

# Backup existing proxy_params
backup_file "/etc/nginx/proxy_params" "proxy_params.backup"

# Copy proxy_params (but check if it will conflict)
if [[ -f "/etc/nginx/proxy_params" ]]; then
    echo -e "${YELLOW}proxy_params already exists${NC}"
    if ! cmp -s "proxy_params" "/etc/nginx/proxy_params"; then
        echo "Files are different. Current content:"
        echo "----------------------------------------"
        head -5 /etc/nginx/proxy_params
        echo "----------------------------------------"
        read -p "Do you want to overwrite proxy_params? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp proxy_params /etc/nginx/proxy_params
        else
            echo -e "${YELLOW}Keeping existing proxy_params${NC}"
        fi
    else
        echo -e "${GREEN}proxy_params is identical, no changes needed${NC}"
    fi
else
    echo -e "${BLUE}Copying proxy_params...${NC}"
    cp proxy_params /etc/nginx/proxy_params
fi

# Copy site configuration with our chosen name
echo -e "${BLUE}Installing site configuration as '$SITE_NAME'...${NC}"
cp portal "/etc/nginx/sites-available/$SITE_NAME"

# Check if site is already enabled
if [[ -L "/etc/nginx/sites-enabled/$SITE_NAME" ]]; then
    echo -e "${GREEN}Site '$SITE_NAME' is already enabled${NC}"
else
    echo -e "${BLUE}Enabling site '$SITE_NAME'...${NC}"
    ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
fi

# Check for other sites that might conflict on the same port
echo -e "${BLUE}Checking for potential port conflicts with other sites...${NC}"
conflicting_sites=$(grep -l "listen.*$LISTEN_PORT" /etc/nginx/sites-enabled/* 2>/dev/null | grep -v "$SITE_NAME" || true)
if [[ -n "$conflicting_sites" ]]; then
    echo -e "${YELLOW}Warning: Found other sites listening on port $LISTEN_PORT:${NC}"
    for site in $conflicting_sites; do
        echo "  - $(basename "$site")"
    done
    echo "You may need to resolve these conflicts manually"
fi

# Offer to disable default site
if [[ -f "/etc/nginx/sites-enabled/default" ]]; then
    echo -e "${YELLOW}Default nginx site is enabled${NC}"
    read -p "Do you want to disable it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Disabling default site...${NC}"
        rm -f /etc/nginx/sites-enabled/default
    fi
fi

# Test nginx configuration
echo -e "${BLUE}Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}Configuration test successful!${NC}"
    
    # Ask before reloading
    read -p "Do you want to reload nginx now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}Reloading nginx...${NC}"
        systemctl reload nginx
        echo -e "${GREEN}Setup complete!${NC}"
    else
        echo -e "${YELLOW}Setup complete but nginx not reloaded${NC}"
        echo "Run 'sudo systemctl reload nginx' when ready"
    fi
else
    echo -e "${RED}Configuration test failed!${NC}"
    echo "Check the configuration files and try again"
    echo "Backups are available in: $BACKUP_DIR"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Setup Summary ===${NC}"
echo "Site name: $SITE_NAME"
echo "Listen port: $LISTEN_PORT"
echo "Backups saved to: $BACKUP_DIR"
echo ""
echo -e "${GREEN}Your services will be available at:${NC}"
echo "  Frontend: http://localhost:$LISTEN_PORT/"
echo "  Lyric API: http://localhost:$LISTEN_PORT/lyric/"
echo "  Lectern API: http://localhost:$LISTEN_PORT/lectern/"
echo "  Song API: http://localhost:$LISTEN_PORT/song/"
echo "  Score API: http://localhost:$LISTEN_PORT/score/"
echo "  Maestro API: http://localhost:$LISTEN_PORT/maestro/"
echo "  Elasticsearch: http://localhost:$LISTEN_PORT/es/"
echo "  Minio: http://localhost:$LISTEN_PORT/minio/"
echo ""
echo -e "${BLUE}To undo this setup, restore files from: $BACKUP_DIR${NC}"