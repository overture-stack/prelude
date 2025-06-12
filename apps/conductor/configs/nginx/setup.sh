#!/bin/bash

# ============================================================================
# Overture Prelude - Cautious nginx setup script
# ============================================================================
# Safely installs a new nginx site without disrupting existing configurations.
# ============================================================================

set -e  # Exit on error

# ─── Config ─────────────────────────────────────────────────────────────────
SITE_NAME="pantrack.genomeinformatics"
LISTEN_PORT="8080"
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"

# ─── Colors ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
MAGENTA='\033[1;35m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

# ─── Utilities ─────────────────────────────────────────────────────────────
step() {
    echo -e "\n${MAGENTA}[$1/$2]${NC} $3"
}

error_exit() {
    echo -e "${RED}✘ $1${NC}"
    exit 1
}

backup_file() {
    local file_path="$1"
    local backup_name="$2"
    if [[ -f "$file_path" ]]; then
        echo -e "${YELLOW}↳ Backing up $file_path${NC}"
        cp "$file_path" "$BACKUP_DIR/$backup_name"
    fi
}

# ─── Start ─────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔═════════════════════════════════════════════════════════════╗"
echo -e   "║   Setting up nginx configuration for Overture Prelude       ║"
echo -e   "╚═════════════════════════════════════════════════════════════╝${NC}"

# ─── Pre-flight Checks ────────────────────────────────────────────────────
step 1 10 "Checking for prerequisites"

if [[ $EUID -ne 0 ]]; then
    error_exit "This script must be run as root (use sudo)."
fi

command -v nginx &>/dev/null || error_exit "nginx is not installed."

required_files=("nginx.conf" "proxy_params" "portal")
for file in "${required_files[@]}"; do
    [[ -f "$file" ]] || error_exit "Required file '$file' is missing from current directory."
done

mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✔ Backup directory created: $BACKUP_DIR${NC}"

# ─── Port Conflict Check ──────────────────────────────────────────────────
step 2 10 "Checking for port conflicts on $LISTEN_PORT"
if netstat -tuln 2>/dev/null | grep -q ":$LISTEN_PORT "; then
    echo -e "${YELLOW}⚠ Port $LISTEN_PORT appears to be in use. Proceeding anyway.${NC}"
fi

# ─── Confirm Overwrite ────────────────────────────────────────────────────
step 3 10 "Checking for existing site config"
if [[ -f "/etc/nginx/sites-available/$SITE_NAME" ]]; then
    echo -e "${YELLOW}Site '$SITE_NAME' already exists.${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error_exit "Aborted by user."
    fi
fi

# ─── Backup Existing ──────────────────────────────────────────────────────
step 4 10 "Backing up existing nginx config"
backup_file "/etc/nginx/nginx.conf" "nginx.conf.backup"

mkdir -p "$BACKUP_DIR/sites-available" "$BACKUP_DIR/sites-enabled"
cp -a /etc/nginx/sites-available/. "$BACKUP_DIR/sites-available/" 2>/dev/null || true
cp -a /etc/nginx/sites-enabled/. "$BACKUP_DIR/sites-enabled/" 2>/dev/null || true

# ─── Install nginx.conf ───────────────────────────────────────────────────
step 5 10 "Ensuring nginx.conf includes sites-enabled"
if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
    echo -e "${YELLOW}nginx.conf does not include sites-enabled.${NC}"
    read -p "Do you want to replace nginx.conf with the provided one? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp nginx.conf /etc/nginx/nginx.conf
        echo -e "${GREEN}✔ nginx.conf replaced${NC}"
    else
        echo -e "${YELLOW}↳ Skipping nginx.conf replacement${NC}"
    fi
else
    echo -e "${GREEN}✔ nginx.conf already includes sites-enabled${NC}"
fi

# ─── proxy_params ─────────────────────────────────────────────────────────
step 6 10 "Installing proxy_params"
backup_file "/etc/nginx/proxy_params" "proxy_params.backup"

if [[ -f "/etc/nginx/proxy_params" ]]; then
    if ! cmp -s "proxy_params" "/etc/nginx/proxy_params"; then
        echo -e "${YELLOW}proxy_params differs from existing.${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp proxy_params /etc/nginx/proxy_params
            echo -e "${GREEN}✔ proxy_params updated${NC}"
        else
            echo -e "${YELLOW}↳ Keeping existing proxy_params${NC}"
        fi
    else
        echo -e "${GREEN}✔ proxy_params is identical. No changes needed.${NC}"
    fi
else
    cp proxy_params /etc/nginx/proxy_params
    echo -e "${GREEN}✔ proxy_params installed${NC}"
fi

# ─── Install and Enable Site ──────────────────────────────────────────────
step 7 10 "Installing and enabling site '$SITE_NAME'"
cp portal "/etc/nginx/sites-available/$SITE_NAME"

SITE_CONFIG="/etc/nginx/sites-available/$SITE_NAME"
if grep -q "server_name {SITE_NAME};" "$SITE_CONFIG"; then
    sed -i "s/server_name {SITE_NAME};/server_name $SITE_NAME;/" "$SITE_CONFIG"
    echo -e "${GREEN}✔ server_name replaced with '$SITE_NAME'${NC}"
else
    echo -e "${YELLOW}⚠ server_name placeholder not found in site config. Skipped replacement.${NC}"
fi

ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
echo -e "${GREEN}✔ Site $SITE_NAME linked${NC}"

# ─── Check for Conflicts ──────────────────────────────────────────────────
step 8 10 "Checking for other sites using port $LISTEN_PORT"
conflicting_sites=$(grep -l "listen.*$LISTEN_PORT" /etc/nginx/sites-enabled/* 2>/dev/null | grep -v "$SITE_NAME" || true)
if [[ -n "$conflicting_sites" ]]; then
    echo -e "${YELLOW}⚠ Found other sites listening on $LISTEN_PORT:${NC}"
    for site in $conflicting_sites; do
        echo "  - $(basename "$site")"
    done
fi

# ─── Default Site ─────────────────────────────────────────────────────────
step 9 10 "Checking default site"
if [[ -f "/etc/nginx/sites-enabled/default" ]]; then
    echo -e "${YELLOW}Default site is enabled.${NC}"
    read -p "Do you want to disable it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f /etc/nginx/sites-enabled/default
        echo -e "${GREEN}✔ Default site disabled${NC}"
    fi
fi

# ─── Test and Reload ──────────────────────────────────────────────────────
step 10 10 "Testing nginx configuration"
if nginx -t; then
    echo -e "${GREEN}✔ Configuration test passed${NC}"
    read -p "Reload nginx now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        systemctl reload nginx
        echo -e "${GREEN}✔ nginx reloaded${NC}"
    else
        echo "↳ Reload skipped"
    fi
else
    error_exit "nginx configuration test failed. See above for details."
fi

# ─── Done ─────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔══════════════════════════╗"
echo    "║   Nginx Setup Complete   ║"
echo -e "╚══════════════════════════╝${NC}"

echo -e "\n${GREEN}📂 Backups saved to:${NC} $BACKUP_DIR"
echo -e "${GREEN}🌐 Site will be available via DNS (port 80) once DNS is configured.${NC}"
echo -e "\n${BLUE}To undo this setup, restore files from the backup directory above.${NC}\n"
