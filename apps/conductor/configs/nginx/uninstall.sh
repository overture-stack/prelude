#!/bin/bash

# Uninstall script for Overture Prelude nginx configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SITE_NAME="overture-prelude"

echo -e "${BLUE}Overture Prelude nginx configuration removal script${NC}"
echo ""

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root or with sudo${NC}"
   exit 1
fi

# Function to list available backups
list_backups() {
    if [[ -d "/etc/nginx/backups" ]]; then
        echo -e "${BLUE}Available backups:${NC}"
        ls -la /etc/nginx/backups/ | grep "^d" | awk '{print $9}' | grep -v "^\.$\|^\.\.$" | sort -r
        return 0
    else
        echo -e "${YELLOW}No backup directory found${NC}"
        return 1
    fi
}

# Check what's currently installed
echo -e "${BLUE}Checking current installation...${NC}"

# Check if our site exists
if [[ -f "/etc/nginx/sites-available/$SITE_NAME" ]]; then
    echo -e "${GREEN}Found Overture Prelude site configuration${NC}"
    SITE_EXISTS=true
else
    echo -e "${YELLOW}Overture Prelude site configuration not found${NC}"
    SITE_EXISTS=false
fi

# Check if site is enabled
if [[ -L "/etc/nginx/sites-enabled/$SITE_NAME" ]]; then
    echo -e "${GREEN}Site is currently enabled${NC}"
    SITE_ENABLED=true
else
    SITE_ENABLED=false
fi

if [[ "$SITE_EXISTS" == false ]]; then
    echo -e "${YELLOW}Nothing to uninstall${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}This will remove:${NC}"
echo "  - /etc/nginx/sites-available/$SITE_NAME"
if [[ "$SITE_ENABLED" == true ]]; then
    echo "  - /etc/nginx/sites-enabled/$SITE_NAME (symlink)"
fi

echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted by user${NC}"
    exit 1
fi

# Disable site if enabled
if [[ "$SITE_ENABLED" == true ]]; then
    echo -e "${BLUE}Disabling site...${NC}"
    rm -f "/etc/nginx/sites-enabled/$SITE_NAME"
fi

# Remove site configuration
echo -e "${BLUE}Removing site configuration...${NC}"
rm -f "/etc/nginx/sites-available/$SITE_NAME"

# Ask about restoring backups
echo ""
if list_backups; then
    echo ""
    read -p "Do you want to restore from a backup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enter backup directory name (from list above):"
        read -r backup_dir
        
        if [[ -d "/etc/nginx/backups/$backup_dir" ]]; then
            echo -e "${BLUE}Restoring from backup: $backup_dir${NC}"
            
            # Restore nginx.conf if backup exists
            if [[ -f "/etc/nginx/backups/$backup_dir/nginx.conf.backup" ]]; then
                read -p "Restore nginx.conf? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    cp "/etc/nginx/backups/$backup_dir/nginx.conf.backup" "/etc/nginx/nginx.conf"
                    echo -e "${GREEN}nginx.conf restored${NC}"
                fi
            fi
            
            # Restore proxy_params if backup exists
            if [[ -f "/etc/nginx/backups/$backup_dir/proxy_params.backup" ]]; then
                read -p "Restore proxy_params? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    cp "/etc/nginx/backups/$backup_dir/proxy_params.backup" "/etc/nginx/proxy_params"
                    echo -e "${GREEN}proxy_params restored${NC}"
                fi
            fi
        else
            echo -e "${RED}Backup directory not found: $backup_dir${NC}"
        fi
    fi
fi

# Test nginx configuration
echo -e "${BLUE}Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}Configuration test successful!${NC}"
    
    read -p "Reload nginx now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        systemctl reload nginx
        echo -e "${GREEN}nginx reloaded${NC}"
    fi
else
    echo -e "${RED}Configuration test failed!${NC}"
    echo "You may need to manually fix the nginx configuration"
    exit 1
fi

echo ""
echo -e "${GREEN}Overture Prelude nginx configuration removed successfully${NC}"
echo ""
echo -e "${BLUE}Note: This script only removes the Overture Prelude site configuration.${NC}"
echo -e "${BLUE}Other files like nginx.conf and proxy_params were left as-is unless restored from backup.${NC}"