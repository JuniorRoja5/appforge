# Nginx — AppForge SaaS

## Structure

This directory contains two files that together compose the production Nginx config:

- **`nginx.conf`** → main config, deploys to `/etc/nginx/nginx.conf`. Defines global directives (events, http block, gzip, security headers, rate-limit zones, upload limits, SSL hardening). Includes `sites-enabled/*` and `conf.d/*.conf`.
- **`sites-available/appforge.conf`** → site config, deploys to `/etc/nginx/sites-available/appforge.conf` and is symlinked from `sites-enabled/`. Contains only `upstream` and `server` blocks for the 5 subdomains.

## First-time deploy (fresh server)

```bash
cd /opt/appforge

# 1. Install main config
sudo cp infra/nginx/nginx.conf /etc/nginx/nginx.conf

# 2. Install site config
sudo cp infra/nginx/sites-available/appforge.conf /etc/nginx/sites-available/appforge.conf

# 3. Enable the site (symlink)
sudo ln -sf /etc/nginx/sites-available/appforge.conf /etc/nginx/sites-enabled/appforge.conf

# 4. Disable the default Ubuntu site (only first time)
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Validate and reload
sudo nginx -t
sudo systemctl reload nginx

# 6. (First time only) Issue Let's Encrypt certificates
sudo certbot --nginx -d api.creatu.app -d app.creatu.app -d admin.creatu.app -d storage.creatu.app
```

## Subsequent deploys (config changes)

```bash
cd /opt/appforge
git pull
sudo cp infra/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp infra/nginx/sites-available/appforge.conf /etc/nginx/sites-available/appforge.conf
sudo nginx -t && sudo systemctl reload nginx
```

## Verifying the active config

```bash
# Confirm what's actually loaded
sudo nginx -T 2>/dev/null | grep -E "^# configuration file"

# Confirm upload limit
sudo nginx -T 2>/dev/null | grep -i "client_max_body_size"

# Confirm server names
sudo nginx -T 2>/dev/null | grep -E "^\s*server_name"
```