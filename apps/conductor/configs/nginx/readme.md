# Simple HTTP Nginx Configuration for Overture Prelude

This folder contains a simple nginx configuration to expose your Overture Data Management System services via port 8080 (HTTP only).

## Files Structure

```
nginx-config/
├── nginx.conf       # Main nginx configuration
├── proxy_params     # Proxy parameters
├── portal           # Site configuration (port 8080)
├── setup.sh         # Automated setup script (safe for existing sites)
├── uninstall.sh     # Clean removal script
└── README.md        # This file
```

## Quick Setup

### Option 1: Automated Setup (Recommended)

The setup script is designed to be safe when other sites are already configured:

```bash
chmod +x setup.sh
sudo ./setup.sh
```

**The setup script will:**

- Create timestamped backups of existing files
- Use a unique site name (`overture-prelude`) to avoid conflicts
- Check for port conflicts and warn you
- Ask for confirmation before making changes
- Test the configuration before applying
- Preserve existing nginx configurations

### Option 2: Manual Setup

```bash
# Copy main configuration
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo cp proxy_params /etc/nginx/proxy_params

# Create and enable site
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo cp portal /etc/nginx/sites-available/portal
sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Service Endpoints

After deployment, your services will be available at:

- **Frontend (Stage):** `http://your-server:8080/`
- **Arranger APIs (Frontend endpoints):**
  - `http://your-server:8080/api/datatable1_arranger/`
  - `http://your-server:8080/api/datatable2_arranger/`
  - `http://your-server:8080/api/molecular_arranger/`
- **Arranger APIs (Direct access):**
  - `http://your-server:8080/datatable1-api/`
  - `http://your-server:8080/datatable2-api/`
  - `http://your-server:8080/molecular-api/`
- **Data Management Services:**
  - **Lyric:** `http://your-server:8080/lyric/`
  - **Lectern:** `http://your-server:8080/lectern/`
  - **Song:** `http://your-server:8080/song/`
  - **Score:** `http://your-server:8080/score/`
  - **Maestro:** `http://your-server:8080/maestro/`
- **Infrastructure:**
  - **Elasticsearch:** `http://your-server:8080/es/`
  - **Minio:** `http://your-server:8080/minio/`

## Safety Features

The setup script includes several safety measures:

- **Automatic backups** with timestamps in `/etc/nginx/backups/`
- **Port conflict detection** - warns if port 8080 is already in use
- **Non-destructive installation** - uses unique site name `overture-prelude`
- **Configuration validation** - tests nginx config before applying
- **Interactive prompts** - asks permission before overwriting files
- **Rollback capability** - backups allow easy restoration

### Uninstalling

To cleanly remove the Overture Prelude configuration:

```bash
chmod +x uninstall.sh
sudo ./uninstall.sh
```

This will:

- Remove only the Overture Prelude site configuration
- Offer to restore from backups
- Leave other sites untouched
- Test configuration before finalizing

## Port Mapping

The configuration expects your Docker services on these ports:

- Stage (Frontend): 3000
- Arranger DataTable 1: 5050
- Arranger DataTable 2: 5051
- Arranger Molecular: 5060
- Lyric: 3030
- Lectern: 3031
- Song: 8080
- Score: 8087
- Maestro: 11235
- Elasticsearch: 9200
- Minio: 9000

## Customization

### Change Server Name

Edit `portal` file and replace `localhost` with your domain:

```nginx
server_name your-domain.com;
```

### Change Port

Edit `portal` file and change the listen directive:

```nginx
listen 80;  # or any other port
listen [::]:80;
```

### Add Authentication

Add basic auth to sensitive endpoints:

```nginx
location /es/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:9200/;
    include proxy_params;
}
```

## Troubleshooting

### Check nginx status:

```bash
sudo systemctl status nginx
```

### View logs:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Test configuration:

```bash
sudo nginx -t
```

### Test endpoints:

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/lyric/
```

### Common Issues

1. **502 Bad Gateway:** Backend service not running
2. **Permission denied:** Check file permissions and nginx user
3. **Port conflicts:** Ensure port 8080 is available
4. **Path not found:** Verify service ports in Docker Compose

## Notes

- This is an HTTP-only configuration (no SSL/HTTPS)
- Based on Ubuntu/Debian nginx structure with sites-available/sites-enabled
- Includes websocket support for real-time features
- Security headers are minimal for development use
- No rate limiting or advanced security features
