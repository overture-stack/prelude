# Deployment with Nginx

So far, the portal runs on `localhost`, accessible only from your own machine. To make it available to collaborators on your institutional network or the public internet, you need a reverse proxy. Nginx is the standard tool for this.

> **What is a reverse proxy?** A reverse proxy is a server that sits in front of your application and forwards incoming requests to it. Rather than users connecting directly to your Docker containers (which run on internal ports like `3000` or `5050`), they connect to Nginx on standard ports (`80`/`443`). Nginx then routes each request to the correct service based on the URL. This lets you serve multiple services from a single domain, handle SSL termination in one place, and keep your application ports off the public internet.

This section explains the concepts and provides a real-world configuration example. Hands-on setup is beyond the scope of this workshop but this serves as a reference for when you're ready to deploy.

## What Nginx Does

> **ILLUSTRATION NEEDED:** A deployment architecture diagram showing: External users (browser, API clients) → Internet/Network → Nginx (reverse proxy) → Docker containers (Stage:3000, Arranger:5050, Elasticsearch:9200). Nginx sits in the middle, routing requests based on subdomain to the correct backend service. Show the server/VM running Docker as a box containing the containers, with Nginx sitting at the edge.

Without a reverse proxy, your services are only reachable by port number on localhost:

```
http://localhost:3000    →  Stage (portal)
http://localhost:5050    →  Arranger (search API)
http://localhost:9200    →  Elasticsearch
```

Nginx maps readable domain names to these internal ports:

```
https://portal.yourlab.org           →  localhost:3000
https://arranger.portal.yourlab.org  →  localhost:5050
https://es.portal.yourlab.org        →  localhost:9200
```

This provides:

- **Clean URLs:** no port numbers for users to remember
- **SSL/TLS termination:** HTTPS encryption at the proxy level
- **Access control:** restrict which services are exposed externally
- **Load balancing:** distribute traffic if you scale up (future)

## Step 1: DNS Records

Work with your IT department to create DNS records pointing subdomains to your server's IP address.

> **DNS providers:** Where you manage DNS depends on where your domain is registered or hosted. Common providers include **AWS Route 53**, **Cloudflare**, **Google Cloud DNS**, **GoDaddy**, and **Namecheap**. Institutional domains (e.g. `.oicr.on.ca`, `.uhn.ca`) are typically managed IT/sysadmin teams, if your institution has one, raise a ticket with them and provide the table below. For a portal at `portal.yourlab.org`:

| Record Type | Hostname                      | Points To                  |
| ----------- | ----------------------------- | -------------------------- |
| A or CNAME  | `portal.yourlab.org`          | Your server IP or hostname |
| CNAME       | `arranger.portal.yourlab.org` | `portal.yourlab.org`       |
| CNAME       | `es.portal.yourlab.org`       | `portal.yourlab.org`       |

If you have multiple Arranger instances (multiple data tables), each gets its own subdomain:

| CNAME                                    | Points To            |
| ---------------------------------------- | -------------------- |
| `datatable1-arranger.portal.yourlab.org` | `portal.yourlab.org` |
| `datatable2-arranger.portal.yourlab.org` | `portal.yourlab.org` |

> **Note:** Hostnames must be lowercase. No uppercase characters are accepted in DNS records.

## Step 2: Nginx Configuration

Install nginx on your server:

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

Create a configuration file for your portal. Below is a working example based on a real Overture deployment:

```nginx
# Main portal — Stage frontend
server {
    listen 80;
    listen [::]:80;
    server_name portal.yourlab.org;

    location / {
        proxy_pass http://localhost:3000;
        include proxy_params;
    }
}

# Arranger search API
server {
    listen 80;
    listen [::]:80;
    server_name arranger.portal.yourlab.org;

    location / {
        proxy_pass http://localhost:5050/;
        include proxy_params;
    }
}

# Elasticsearch (optional — expose only if external tools need direct access)
server {
    listen 80;
    listen [::]:80;
    server_name es.portal.yourlab.org;

    location / {
        proxy_pass http://localhost:9200/;
        include proxy_params;
    }
}
```

Save this as `/etc/nginx/sites-available/portal` and enable it:

```bash
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t        # Test configuration
sudo systemctl reload nginx
```

### With Multiple Arranger Instances

If your portal has multiple data tables, each Arranger instance runs on a different port and gets its own server block:

```nginx
# Datatable 1 Arranger
server {
    listen 80;
    listen [::]:80;
    server_name datatable1-arranger.portal.yourlab.org;

    location / {
        proxy_pass http://localhost:5050/;
        include proxy_params;
    }
}

# Datatable 2 Arranger
server {
    listen 80;
    listen [::]:80;
    server_name datatable2-arranger.portal.yourlab.org;

    location / {
        proxy_pass http://localhost:5051/;
        include proxy_params;
    }
}
```

## Step 3: Update Stage API URLs

When deploying behind nginx, Stage needs to know the public URLs for the Arranger APIs. Update the environment variables in `docker-compose.yml`:

**Local (before nginx):**

```yaml
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: http://arranger-datatable1:5050
```

**Production (behind nginx):**

```yaml
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: https://arranger.portal.yourlab.org
```

Rebuild and restart Stage after this change with `make restart`.

## Step 4: SSL/TLS with Let's Encrypt

For HTTPS (strongly recommended for any non-localhost deployment), use Certbot with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.yourlab.org -d arranger.portal.yourlab.org -d es.portal.yourlab.org
```

Certbot will automatically modify your nginx configuration to handle HTTPS and set up certificate auto-renewal.

## Security Considerations

When exposing services externally:

- **Elasticsearch:** Consider whether it needs to be publicly accessible. If only Arranger queries it, keep it internal (don't create the `es.*` subdomain/server block).
- **Credentials:** Change the default Elasticsearch password (`myelasticpassword`) to something secure.
- **Firewall:** Only expose ports 80 and 443 through your firewall. Docker's internal ports (3000, 5050, 9200, 5432) should not be directly accessible from outside.
- **Authentication:** Stage supports NextAuth for user authentication. For portals with restricted access, configure authentication providers in the Stage environment variables.

## Real-World Example

The Overture team has deployed portals for multiple research groups using this exact architecture. A typical production setup includes:

- A single VM or server running Docker
- Nginx as a reverse proxy with SSL
- DNS CNAME records for each service subdomain
- Automated certificate renewal via Certbot
- Firewall rules restricting direct port access

This pattern scales from a single-table lab portal to multi-table institutional platforms serving external collaborators.

> **Next:** Wrap up with resources, next steps, and guidance on adapting the portal to your own data.
