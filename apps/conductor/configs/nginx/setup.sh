#!/bin/bash

# ============================================================================
# Generic Nginx Site Setup Script
# ============================================================================
# Safely installs a new nginx site configuration with multiple subdomains
# without disrupting existing configurations.
# ============================================================================

set -e  # Exit on error

# ─── Config ─────────────────────────────────────────────────────────────────
# Edit these variables to customize your setup
SITE_NAME="${1:-example.com}"  # Can be passed as first argument
FRONTEND_PORT="${2:-3000}"     # Can be passed as second argument
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"

# Service port mappings (customize as needed)
declare -A SERVICE_PORTS=(
    ["lyric"]="3030"
    ["arranger_1"]="5050"
    ["lectern"]="3031"
    ["maestro"]="11235"
    ["es"]="9200"
)

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

show_usage() {
    echo "Usage: $0 [SITE_NAME] [FRONTEND_PORT]"
    echo "Example: $0 mysite.com 3000"
    echo "Example: $0 pantrack.genomeinformatics.org 3000"
    echo ""
    echo "This will create nginx configurations for:"
    echo "  - Main site: SITE_NAME"
    echo "  - Lyric API: lyric.SITE_NAME"
    echo "  - Arranger 1: arranger_1.SITE_NAME"
    echo "  - Lectern: lectern.SITE_NAME"
    echo "  - Maestro: maestro.SITE_NAME"
    echo "  - Elasticsearch: es.SITE_NAME"
}

generate_nginx_config() {
    local site_name="$1"
    local frontend_port="$2"
    
    cat > "/tmp/nginx_site_config" << EOF
# Main ${site_name} site
server {
    listen 80;
    listen [::]:80;
    server_name ${site_name};

    # Frontend
    location / {
        proxy_pass http://localhost:${frontend_port};
        include proxy_params;
    }

    # Specific Arranger dataset endpoints that the frontend expects
    location /api/dataset_1_arranger/ {
        proxy_pass http://localhost:${SERVICE_PORTS["arranger_1"]}/;
        include proxy_params;
    }
}

EOF

    # Generate subdomain configurations
    for service in "${!SERVICE_PORTS[@]}"; do
        cat >> "/tmp/nginx_site_config" << EOF
# ${service^} service
server {
    listen 80;
    listen [::]:80;
    server_name ${service}.${site_name};

    location / {
        proxy_pass http://localhost:${SERVICE_PORTS[$service]}/;
        include proxy_params;
    }
}

EOF
    done
}

# ─── Start ─────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔═════════════════════════════════════════════════════════════╗"
echo -e   "║             Generic Nginx Site Setup Script                 ║"
echo -e   "╚═════════════════════════════════════════════════════════════╝${NC}"

# Show usage if requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Validate site name
if [[ -z "$SITE_NAME" || "$SITE_NAME" == "example.com" ]]; then
    echo -e "${RED}Please provide a valid site name.${NC}"
    show_usage
    exit 1
fi

echo -e "${BLUE}Setting up nginx for: ${SITE_NAME}${NC}"
echo -e "${BLUE}Frontend port: ${FRONTEND_PORT}${NC}"

# ─── Pre-flight Checks ────────────────────────────────────────────────────
step 1 12 "Checking for prerequisites"

if [[ $EUID -ne 0 ]]; then
    error_exit "This script must be run as root (use sudo)."
fi

command -v nginx &>/dev/null || error_exit "nginx is not installed."

# Check if proxy_params exists or will be created
if [[ ! -f "proxy_params" && ! -f "/etc/nginx/proxy_params" ]]; then
    error_exit "proxy_params file is missing. Please ensure it exists in current directory or /etc/nginx/"
fi

mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✔ Backup directory created: $BACKUP_DIR${NC}"

# ─── Port Conflicts Check ──────────────────────────────────────────────────
step 2 12 "Checking for port conflicts"
conflicting_ports=()
all_ports=("$FRONTEND_PORT" "${SERVICE_PORTS[@]}")

for port in "${all_ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        conflicting_ports+=("$port")
    fi
done

if [[ ${#conflicting_ports[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠ The following ports appear to be in use: ${conflicting_ports[*]}${NC}"
    echo -e "${YELLOW}  Make sure your services are running on these ports.${NC}"
fi

# ─── Generate Configuration ───────────────────────────────────────────────
step 3 12 "Generating nginx configuration"
generate_nginx_config "$SITE_NAME" "$FRONTEND_PORT"
echo -e "${GREEN}✔ Configuration generated${NC}"

# ─── Confirm Overwrite ────────────────────────────────────────────────────
step 4 12 "Checking for existing site config"
if [[ -f "/etc/nginx/sites-available/$SITE_NAME" ]]; then
    echo -e "${YELLOW}Site '$SITE_NAME' already exists.${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error_exit "Aborted by user."
    fi
fi

# ─── Backup Existing ──────────────────────────────────────────────────────
step 5 12 "Backing up existing nginx config"
backup_file "/etc/nginx/nginx.conf" "nginx.conf.backup"

mkdir -p "$BACKUP_DIR/sites-available" "$BACKUP_DIR/sites-enabled"
cp -a /etc/nginx/sites-available/. "$BACKUP_DIR/sites-available/" 2>/dev/null || true
cp -a /etc/nginx/sites-enabled/. "$BACKUP_DIR/sites-enabled/" 2>/dev/null || true

# ─── Install nginx.conf ───────────────────────────────────────────────────
step 6 12 "Ensuring nginx.conf includes sites-enabled"
if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
    echo -e "${YELLOW}nginx.conf does not include sites-enabled.${NC}"
    if [[ -f "nginx.conf" ]]; then
        read -p "Do you want to replace nginx.conf with the provided one? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp nginx.conf /etc/nginx/nginx.conf
            echo -e "${GREEN}✔ nginx.conf replaced${NC}"
        else
            echo -e "${YELLOW}↳ You may need to manually add 'include /etc/nginx/sites-enabled/*;' to nginx.conf${NC}"
        fi
    else
        echo -e "${YELLOW}↳ You may need to manually add 'include /etc/nginx/sites-enabled/*;' to nginx.conf${NC}"
    fi
else
    echo -e "${GREEN}✔ nginx.conf already includes sites-enabled${NC}"
fi

# ─── proxy_params ─────────────────────────────────────────────────────────
step 7 12 "Installing proxy_params"
if [[ -f "proxy_params" ]]; then
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
else
    echo -e "${GREEN}✔ Using existing proxy_params${NC}"
fi

# ─── Install Site Configuration ───────────────────────────────────────────
step 8 12 "Installing site configuration"
cp "/tmp/nginx_site_config" "/etc/nginx/sites-available/$SITE_NAME"
echo -e "${GREEN}✔ Site configuration installed${NC}"

# ─── Enable Site ──────────────────────────────────────────────────────────
step 9 12 "Enabling site '$SITE_NAME'"
ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
echo -e "${GREEN}✔ Site $SITE_NAME enabled${NC}"

# ─── Check for Conflicts ──────────────────────────────────────────────────
step 10 12 "Checking for conflicting site configurations"
conflicting_sites=$(grep -l "server_name.*$SITE_NAME" /etc/nginx/sites-enabled/* 2>/dev/null | grep -v "$SITE_NAME" || true)
if [[ -n "$conflicting_sites" ]]; then
    echo -e "${YELLOW}⚠ Found other sites with similar server names:${NC}"
    for site in $conflicting_sites; do
        echo "  - $(basename "$site")"
    done
fi

# ─── Default Site ─────────────────────────────────────────────────────────
step 11 12 "Checking default site"
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
step 12 12 "Testing nginx configuration"
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

# ─── Cleanup ──────────────────────────────────────────────────────────────
rm -f "/tmp/nginx_site_config"

# ─── Done ─────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔══════════════════════════╗"
echo    "║   Nginx Setup Complete   ║"
echo -e "╚══════════════════════════╝${NC}"

echo -e "\n${GREEN}📂 Backups saved to:${NC} $BACKUP_DIR"
echo -e "\n${BLUE}The following domains will be served:${NC}"
echo -e "  • ${SITE_NAME} (main site)"
for service in "${!SERVICE_PORTS[@]}"; do
    echo -e "  • ${service}.${SITE_NAME} (${service} service)"
done

echo -e "\n${YELLOW}📋 DNS Configuration Required:${NC}"
echo -e "Make sure the following DNS records point to this server:"
echo -e "  A    ${SITE_NAME}                    → [SERVER_IP]"
for service in "${!SERVICE_PORTS[@]}"; do
    echo -e "  A    ${service}.${SITE_NAME}       → [SERVER_IP]"
done

echo -e "\n${BLUE}To undo this setup, restore files from the backup directory above.${NC}\n"