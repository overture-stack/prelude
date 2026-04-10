# Deployment with Nginx

So far, the portal runs on `localhost`, accessible only from your own machine. To make it available to collaborators on your institutional network or the public internet, you need a reverse proxy — a traffic router that sits in front of your services. Nginx is the standard tool for this.

<details>
<summary><strong>What Nginx does</strong></summary>

By default, each service in the platform runs on its own port and is only reachable from your local machine:

```plaintext
http://localhost:3000    →  Stage (portal)
http://localhost:5050    →  Arranger (search API)
http://localhost:9200    →  Elasticsearch
```

Nginx sits in front of all of these and acts as a single entry point. It accepts incoming connections on standard web ports (`80`/`443`) and forwards each request to the right service based on the domain, so users never need to know about port numbers:

```plaintext
https://portal.yourlab.org                      →  localhost:3000
https://datatable1-arranger.portal.yourlab.org  →  localhost:5050
```

This also means you handle SSL (HTTPS encryption) in one place rather than on every service individually, and your internal ports stay off the public internet.

For a deeper overview, see the [Nginx beginner's guide](https://nginx.org/en/docs/beginners_guide.html).

</details>

## Guided Walkthrough

The workshop repository includes fully annotated Nginx configuration files in `setup/configs/nginxConfigs/`. Open each file in your editor and work through the questions below.

### portal.conf

Open [setup/configs/nginxConfigs/portal.conf](../setup/configs/nginxConfigs/portal.conf).

This file defines which domains map to which services. There are two active `server` blocks and one commented out. Reading through the Stage block:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        include proxy_params;
    }
}
```

Work through these questions before moving on:

- [ ] Which directive tells Nginx which domain name this block responds to?
- [ ] Where does a request to `portal.yourlab.org/explore` get forwarded?
- [ ] The Arranger block uses `proxy_pass http://localhost:5050/` — why does it have a trailing slash while the Stage block doesn't?
- [ ] Why is the Elasticsearch server block commented out by default?

### proxy_params

Open [setup/configs/nginxConfigs/proxy_params](../setup/configs/nginxConfigs/proxy_params).

This file is pulled in by every server block via `include proxy_params`. It sets timeouts and passes headers the backend services need. Focus on the headers section:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

- [ ] Without `proxy_set_header Host $host`, what host value would Stage see on incoming requests?
- [ ] Why does a backend behind a proxy need `X-Forwarded-Proto`?
- [ ] What would happen if you removed the WebSocket headers from a service that used WebSockets?

### nginx.conf

Open [setup/configs/nginxConfigs/nginx.conf](../setup/configs/nginxConfigs/nginx.conf).

This is the global config — worker processes, logging, gzip, security headers, TLS settings. You typically configure this once during initial server setup. Scan the file and find:

- [ ] Which security headers does this config add to every response, and what does each protect against?
- [ ] Why is the HSTS header commented out? When should you enable it?
- [ ] Where does this file tell Nginx to look for site configs like `portal.conf`?

---

## Extension Activity (Optional)

:::info
This section is for attendees who finish the main walkthrough early. It adds a containerized Nginx to the local stack so you can access the portal at `http://portal.local` instead of `http://localhost:3000` — making the configuration tangible rather than purely conceptual.
:::

:::caution Important difference from production
When Nginx runs as a container inside the Docker network, `proxy_pass` uses Docker service names (`stage`, `arranger-datatable1`) instead of `localhost`. Both approaches are valid in different contexts — the concepts and config syntax are identical, only the upstream addresses differ. The production deployment steps below use the host-installed pattern (Nginx outside Docker, `proxy_pass http://localhost:3000`).
:::

### Step 1: Add /etc/hosts entries

Nginx routes requests by domain name. To make `portal.local` resolve to your machine, add an entry to your local hosts file:

**macOS / Linux:**

```bash
echo "127.0.0.1 portal.local datatable1-arranger.portal.local" | sudo tee -a /etc/hosts
```

**Windows (WSL2):** Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator and add:

```
127.0.0.1 portal.local datatable1-arranger.portal.local
```

:::info
Port 80 must be free on your machine. If something else is using it (another web server, etc.), you'll see a bind error when starting Nginx. Check with `sudo lsof -i :80` (macOS/Linux).
:::

### Step 2: Start Nginx

With the platform already running (`make demo` or `make platform`), start the Nginx container:

```bash
make nginx
```

This starts an `nginx:alpine` container that mounts [setup/configs/nginxConfigs/workshop-nginx.conf](../setup/configs/nginxConfigs/workshop-nginx.conf) and joins the same Docker network as the other services.

### Step 3: Open the portal via domain

Navigate to **http://portal.local** in your browser. You should see the same portal that was previously only at `http://localhost:3000`.

Open [setup/configs/nginxConfigs/workshop-nginx.conf](../setup/configs/nginxConfigs/workshop-nginx.conf) and compare it with `portal.conf`:

- [ ] What is different about the `proxy_pass` values between the two files, and why?
- [ ] What would happen if you changed `server_name portal.local` to `server_name myportal.local` without updating `/etc/hosts`?

### Step 4: Verify Nginx is proxying correctly

Check the Nginx access log to confirm requests are flowing through it:

```bash
docker logs nginx --follow
```

Make a search in the portal, then stop the log stream with `Ctrl+C`. You should see HTTP requests logged for each interaction.

To stop Nginx when you're done:

```bash
docker compose --profile nginx stop nginx
```

---

## Deploying on a Real Server

:::info
The steps below assume you are working on a **dedicated server or cloud VM** (e.g. an AWS EC2 instance, a university HPC node with a public IP, or a rented VPS). Running a publicly accessible portal on a personal laptop is not practical — laptops aren't always on, rarely have a stable public IP, and are typically behind a router that blocks inbound connections.
:::

:::caution
This setup is suited for **small to medium research deployments** such as lab portals, internal collaborative platforms, or pilot studies. It runs all services on a single server with no redundancy. Important limitations:

- **Single point of failure:** if the server goes down, the portal goes down.
- **Elasticsearch is single-node:** not suitable for high-availability or very large datasets without additional tuning.
- **No built-in row-level access control:** all authenticated users see the same data.
- **Backups are not automatic:** the cron job in the production hardening section must be configured manually.
- **Scaling requires migration:** growing beyond a single server means migrating to a container orchestration platform (such as Kubernetes), which is a significant undertaking.

For guidance on scaling or hardening beyond this setup, reach out via [contact@overture.bio](mailto:contact@overture.bio).
:::

### Step 1: DNS Records

Create DNS records wherever your domain is registered (AWS Route 53, Cloudflare, GoDaddy, or your institution's IT team):

| Record Type | Hostname                                 | Points To                  |
| ----------- | ---------------------------------------- | -------------------------- |
| A or CNAME  | `portal.yourlab.org`                     | Your server IP or hostname |
| CNAME       | `datatable1-arranger.portal.yourlab.org` | `portal.yourlab.org`       |

:::info
Hostnames must be lowercase. No uppercase characters are accepted in DNS records.
:::

### Step 2: Install and configure Nginx

Install Nginx on your server:

```bash showLineNumbers
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

Copy the workshop config files to your server:

```bash showLineNumbers
sudo cp setup/configs/nginxConfigs/nginx.conf /etc/nginx/nginx.conf
sudo cp setup/configs/nginxConfigs/proxy_params /etc/nginx/proxy_params
sudo cp setup/configs/nginxConfigs/portal.conf /etc/nginx/sites-available/portal
```

Replace `YOUR_DOMAIN` in `portal.conf` with your actual domain, then enable the site:

```bash showLineNumbers
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t           # always test before reloading
sudo systemctl reload nginx
```

### Step 3: Update Stage API URLs

When deploying behind Nginx, Stage needs to know the public URLs for the Arranger APIs. Update the environment variables in `docker-compose.yml`:

```yaml showLineNumbers
# Before (local)
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: http://arranger-datatable1:5050

# After (production)
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: https://datatable1-arranger.portal.yourlab.org
```

Rebuild and restart Stage after this change with `make restart`.

### Step 4: SSL/TLS with Let's Encrypt

For HTTPS (strongly recommended for any non-localhost deployment), use Certbot with Let's Encrypt:

```bash showLineNumbers
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.yourlab.org -d datatable1-arranger.portal.yourlab.org
```

Certbot automatically modifies your Nginx configuration to handle HTTPS and sets up certificate auto-renewal. Once HTTPS is confirmed working, uncomment the HSTS header in `nginx.conf` and reload Nginx.

<details>
<summary><strong>Security considerations</strong></summary>

When exposing services externally:

- **Elasticsearch:** Arranger already queries Elasticsearch over Docker's internal network, the portal does not need Elasticsearch exposed publicly. If you do expose it, restrict access by IP using `allow`/`deny` directives in the server block and change the default password in `.env`.
- **Credentials:** The default passwords (`admin123`, `myelasticpassword`) are for the workshop only. Production deployments must use the `.env` file with strong random passwords.
- **Firewall:** Only expose ports 80 and 443 through your firewall. Docker's internal ports (3000, 5050, 9200, 5432) should not be directly accessible from outside.
- **Authentication:** Stage supports NextAuth for user authentication. For portals with restricted access, configure authentication providers in the Stage environment variables.
- **CORS:** The portal's CORS policy defaults to `*` (allow all) for development. Set the `CORS_ALLOWED_ORIGIN` environment variable to your domain in production.

</details>

<details>
<summary><strong>Production hardening</strong></summary>

The `docker-compose.yml` has been configured with production-readiness in mind:

| Feature                   | Detail                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Externalized secrets**  | Passwords read from `.env` via `${VARIABLE}` syntax with workshop defaults as fallbacks                   |
| **Restart policies**      | All persistent services set to `restart: unless-stopped`                                                  |
| **Localhost-bound ports** | PostgreSQL, Elasticsearch, and Arranger bound to `127.0.0.1`, accessible locally but not from the network |
| **Health checks**         | All services have health checks so Docker can detect and recover from failures                            |
| **Log rotation**          | All services capped at 50 MB x 10 files (500 MB max per service)                                          |
| **CORS lockdown**         | Configurable via `CORS_ALLOWED_ORIGIN` env var; defaults to `*` only for development                      |

**Steps for your production server:**

1. Create your `.env` file and set strong random passwords:

   ```bash showLineNumbers
   cp .env.example .env
   openssl rand -base64 32   # for POSTGRES_PASSWORD
   openssl rand -base64 32   # for ES_PASSWORD
   openssl rand -base64 48   # for NEXTAUTH_SECRET
   ```

2. Set your CORS origin in `.env`:

   ```bash showLineNumbers
   CORS_ALLOWED_ORIGIN=https://portal.yourlab.org
   ```

3. Copy the workshop Nginx configs to your server and enable the site (see Step 2 above).

4. Run Certbot and then enable HSTS in `nginx.conf`:

   ```bash showLineNumbers
   sudo certbot --nginx -d portal.yourlab.org -d datatable1-arranger.portal.yourlab.org
   ```

   Then uncomment the HSTS line in `/etc/nginx/nginx.conf` and reload:

   ```bash showLineNumbers
   sudo systemctl reload nginx
   ```

5. Configure automated backups:

   ```bash showLineNumbers
   crontab -e
   0 2 * * * /path/to/prelude/setup/scripts/backup.sh
   ```

6. Restrict your firewall to ports 80 and 443 only:

   ```bash showLineNumbers
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

**Production checklist:**

- [ ] `.env` file created with strong random passwords
- [ ] `CORS_ALLOWED_ORIGIN` set to production domain
- [ ] `nginx.conf` and `proxy_params` copied from workshop repo
- [ ] Nginx deployed with TLS via Certbot
- [ ] HSTS enabled in `nginx.conf` after confirming HTTPS works
- [ ] Firewall permits only ports 80 and 443
- [ ] Daily backup cron job configured (`make backup`)
- [ ] DNS records created for portal and Arranger subdomains

</details>

**Next:** Wrap up with resources, next steps, and guidance on adapting the portal further.
