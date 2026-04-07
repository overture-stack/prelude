# Deployment with Nginx

So far, the portal runs on `localhost`, accessible only from your own machine. To make it available to collaborators on your institutional network or the public internet, you need a reverse proxy (a traffic router that sits in front of your services). Nginx is the standard tool for this.

This section explains the concepts and provides a real-world configuration example. Hands-on setup is beyond the scope of this workshop but this serves as a reference for when you're ready to deploy.

<details>
<summary>**What Nginx does**</summary>

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

:::info
The steps in this section assume you are working on a **dedicated server or cloud VM** (e.g. an AWS EC2 instance, a university HPC node with a public IP, or a rented VPS). While technically possible, running a publicly accessible portal on a personal laptop is not practical, laptops aren't always on, rarely have a stable public IP address, and are typically behind a home or office router that blocks inbound connections from the internet.
:::

:::caution
This setup is suited for **small to medium research deployments** such as lab portals, internal collaborative platforms, or pilot studies. It runs all services on a single server with no redundancy. There are some important limitations to be aware of before deploying to production:

- **Single point of failure:** if the server goes down, the portal goes down. There is no automatic failover or clustering.
- **Elasticsearch is single-node:** the default Elasticsearch configuration runs one node with no replicas. This is fine for moderate data volumes but is not suitable for high-availability or very large datasets without additional tuning.
- **No built-in user authentication on data:** Stage supports login via NextAuth, but data in Elasticsearch is not row-level access controlled. All authenticated users see the same data.
- **Backups are not automatic by default:** the `make backup` command and the cron job in the production hardening section must be configured manually.
- **Scaling requires migration:** if your usage grows beyond what a single server can handle, migrating to a container orchestration platform (such as Kubernetes) is a significant undertaking.

For guidance on scaling or hardening beyond this setup, reach out via [contact@overture.bio](mailto:contact@overture.bio).
:::

### Step 1: DNS Records

To make your portal accessible at a domain name, you need to create DNS (Domain Name System) records. Think of DNS as the internet's contact book: it translates a human-readable address like `portal.yourlab.org` into the numerical IP (Internet Protocol) address of your server, so browsers know where to connect.

There are two record types you'll use:

- **A record:** maps a domain directly to your server's IP address
- **CNAME record:** maps a subdomain to another hostname (a human-readable server address) instead

DNS records are managed wherever your domain is registered or hosted, common providers include AWS Route 53, Cloudflare, GoDaddy, or your institution's IT team. For a portal at `portal.yourlab.org`:

| Record Type | Hostname                                 | Points To                  |
| ----------- | ---------------------------------------- | -------------------------- |
| A or CNAME  | `portal.yourlab.org`                     | Your server IP or hostname |
| CNAME       | `datatable1-arranger.portal.yourlab.org` | `portal.yourlab.org`       |

:::info
Hostnames must be lowercase. No uppercase characters are accepted in DNS records.
:::

### Step 2: Nginx Configuration

Nginx (pronounced "engine-x") is a lightweight, high-performance web server widely used as a reverse proxy. It uses two configuration files for this setup:

- **`nginx.conf`:** the global config that controls how Nginx itself runs: worker processes, compression, security headers, logging, and TLS settings. You typically configure this once.
- **`portal.conf`:** the site-specific config that defines which domains map to which services. This is what you update when adding a new data table or service.

Install Nginx on your server:

```bash showLineNumbers
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### Site configuration (portal.conf)

Create your site config at `/etc/nginx/sites-available/portal`:

```nginx showLineNumbers
# Stage frontend — main portal UI
server {
    listen 80;
    listen [::]:80;
    server_name portal.yourlab.org;

    location / {
        proxy_pass http://localhost:3000;
        include proxy_params;
    }
}

# Arranger search API (datatable1)
server {
    listen 80;
    listen [::]:80;
    server_name datatable1-arranger.portal.yourlab.org;

    location / {
        proxy_pass http://localhost:5050/;
        include proxy_params;
    }
}

# Elasticsearch — only uncomment if external tools need direct access.
# Arranger already reaches Elasticsearch over Docker's internal network,
# so the portal does NOT need this block to function.
#
# WARNING: Elasticsearch has no built-in authentication in the default setup.
# If you expose it, restrict access by IP:
#
# server {
#     listen 80;
#     listen [::]:80;
#     server_name es.portal.yourlab.org;
#
#     allow 192.168.1.0/24;  # replace with your trusted IP range
#     deny all;
#
#     location / {
#         proxy_pass http://localhost:9200/;
#         include proxy_params;
#     }
# }
```

<details>
<summary>**Configuration breakdown**</summary>

Each service gets its own `server` block. Here's what the directives mean:

| Directive              | What it does                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `listen 80`            | Accepts incoming HTTP connections on port 80 (standard web port)                                       |
| `listen [::]:80`       | Same as above but for IPv6 connections                                                                 |
| `server_name`          | The domain this block responds to, Nginx uses this to route requests to the right service              |
| `location /`           | Matches all incoming request paths (everything after the domain)                                       |
| `proxy_pass`           | Forwards the request to the internal service running on the specified port                             |
| `include proxy_params` | Loads shared proxy settings: timeouts, buffering, forwarded headers, and WebSocket support (see below) |

**Note on the trailing slash:** `proxy_pass http://localhost:5050/` has a trailing slash. For root `location /` blocks this doesn't change behaviour, but it's good practice: it tells Nginx to strip the location prefix before forwarding, which matters for non-root location paths.

After running Certbot (Step 4), each block will also gain `listen 443 ssl` directives automatically.

For a full reference on Nginx server blocks, see the [Nginx core module docs](https://nginx.org/en/docs/http/ngx_http_core_module.html).

</details>

Enable the site and test:

```bash showLineNumbers
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t           # always test before reloading
sudo systemctl reload nginx
```

#### Global configuration (nginx.conf)

The global `nginx.conf` at `/etc/nginx/nginx.conf` controls Nginx-wide settings. The key things it enables for this deployment:

- **Gzip compression:** compresses API responses before sending them, reducing bandwidth by 70–80% for typical JSON traffic
- **Security headers:** adds `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection` to every response
- **TLS settings:** restricts to TLS 1.2/1.3 and strong ciphers once SSL is enabled
- **Performance tuning:** `sendfile`, `tcp_nopush`, `tcp_nodelay`, and `keepalive_timeout`

A ready-to-use annotated `nginx.conf` is [included in the workshop repository here](https://github.com/overture-stack/prelude/tree/IBCworkshop/setup/configs/nginxConfigs). Copy it to `/etc/nginx/nginx.conf` after reviewing it.

:::info
HSTS (HTTP Strict Transport Security) is included in `nginx.conf` but commented out. Only enable it after you have confirmed HTTPS is working correctly, once a browser sees this header it will refuse to connect over plain HTTP for the next year, which can lock you out if your SSL setup has issues.
:::

#### proxy_params

The `include proxy_params` line in each server block loads a shared file at `/etc/nginx/proxy_params`. This file tells Nginx how to forward requests to your services and passes essential information the backend needs:

| Setting                 | What it does                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| `proxy_connect_timeout` | How long to wait for the initial connection to a backend service (default: 60s)   |
| `proxy_read_timeout`    | How long to wait for a response, increase this if large searches cause 504 errors |
| `proxy_set_header Host` | Passes the original domain name so the backend generates correct URLs and cookies |
| `X-Real-IP`             | Passes the client's real IP address for logging and rate limiting                 |
| `X-Forwarded-For`       | Lists all proxies the request passed through                                      |
| `X-Forwarded-Proto`     | Tells the backend whether the original request was HTTP or HTTPS                  |
| WebSocket headers       | Enables WebSocket connections (harmless for non-WebSocket traffic)                |

A ready-to-use annotated `proxy_params` file is [included in the workshop repository here](https://github.com/overture-stack/prelude/tree/IBCworkshop/setup/configs/nginxConfigs). Copy it to `/etc/nginx/proxy_params`.

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

Certbot will automatically modify your Nginx configuration to handle HTTPS and set up certificate auto-renewal. Once HTTPS is confirmed working, uncomment the HSTS header in `nginx.conf` and reload Nginx.

<details>
<summary>**Security considerations**</summary>

When exposing services externally:

- **Elasticsearch:** Arranger already queries Elasticsearch over Docker's internal network, the portal does not need Elasticsearch exposed publicly. If you do expose it, restrict access by IP using `allow`/`deny` directives in the server block and change the default password in `.env`.
- **Credentials:** The default passwords (`admin123`, `myelasticpassword`) are for the workshop only. Production deployments must use the `.env` file with strong random passwords.
- **Firewall:** Only expose ports 80 and 443 through your firewall. Docker's internal ports (3000, 5050, 9200, 5432) should not be directly accessible from outside.
- **Authentication:** Stage supports NextAuth for user authentication. For portals with restricted access, configure authentication providers in the Stage environment variables.
- **CORS:** The portal's CORS policy defaults to `*` (allow all) for development. Set the `CORS_ALLOWED_ORIGIN` environment variable to your domain in production.

</details>

<details>
<summary>**Production hardening**</summary>

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

3. Copy the workshop Nginx configs to your server:

   ```bash showLineNumbers
   sudo cp nginx.conf /etc/nginx/nginx.conf
   sudo cp proxy_params /etc/nginx/proxy_params
   sudo cp portal.conf /etc/nginx/sites-available/portal
   sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

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
