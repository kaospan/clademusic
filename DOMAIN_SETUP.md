# Custom Domain Setup Guide

This guide will help you configure CladeMusic to work with your custom domain.

## Prerequisites

1. A registered domain name
2. Access to your domain's DNS settings
3. A server with a public IP address
4. Docker and Docker Compose installed

## Step 1: DNS Configuration

Point your domain to your server's IP address by creating DNS records:

```
Type    Name    Value               TTL
A       @       your-server-ip      3600
A       www     your-server-ip      3600
```

Wait for DNS propagation (can take up to 48 hours, usually much faster).

Verify DNS is working:
```bash
# Linux/Mac
dig your-domain.com

# Windows
nslookup your-domain.com
```

## Step 2: Update Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your domain:
```
DOMAIN=your-domain.com
SSL_ENABLED=true
```

## Step 3: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended for Production)

**Linux/Mac:**
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh your-domain.com
```

**Windows (PowerShell):**
```powershell
.\setup-ssl.ps1 -Domain your-domain.com
```

### Option B: Self-Signed Certificate (Testing Only)

```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### Option C: Bring Your Own Certificate

Place your certificate files in the `ssl/` directory:
- `ssl/cert.pem` - Certificate + intermediate chain
- `ssl/key.pem` - Private key

## Step 4: Configure Nginx

Edit `nginx.conf` and uncomment the HTTPS server block (around line 51):

1. Replace `your-domain.com` with your actual domain
2. Uncomment the entire HTTPS `server` block
3. Uncomment the HTTP to HTTPS redirect block at the bottom

Example:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # <-- Change this
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;  # <-- Change this
    return 301 https://$server_name$request_uri;
}
```

## Step 5: Deploy with Docker Compose

### Production Deployment:

```bash
# Build and start the container
docker compose -f compose.prod.yml up -d

# Check logs
docker compose -f compose.prod.yml logs -f

# Verify it's running
docker compose -f compose.prod.yml ps
```

### Test Your Setup:

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://your-domain.com

# Test HTTPS
curl -I https://your-domain.com

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## Step 6: Firewall Configuration

Make sure ports 80 and 443 are open:

**Ubuntu/Debian:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**CentOS/RHEL:**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Cloud Provider:**
- AWS: Configure Security Groups
- Google Cloud: Configure Firewall Rules
- Azure: Configure Network Security Groups

## Certificate Renewal

### Automated Renewal (Let's Encrypt)

Add to crontab:
```bash
crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && docker compose -f compose.prod.yml restart
```

### Manual Renewal

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
docker compose -f compose.prod.yml restart
```

## Troubleshooting

### DNS Not Resolving
- Wait longer for DNS propagation
- Clear your DNS cache: `ipconfig /flushdns` (Windows) or `sudo systemd-resolve --flush-caches` (Linux)
- Use online DNS checkers: https://www.whatsmydns.net/

### Certificate Errors
- Verify certificate files exist in `./ssl/` directory
- Check file permissions: `ls -la ssl/`
- Ensure nginx.conf paths match your certificate locations

### Container Won't Start
```bash
# Check logs
docker compose -f compose.prod.yml logs

# Validate nginx config
docker compose -f compose.prod.yml exec web nginx -t

# Rebuild if needed
docker compose -f compose.prod.yml up -d --build
```

### Port Already in Use
```bash
# Find what's using port 80
sudo lsof -i :80

# Stop conflicting service
sudo systemctl stop apache2  # or nginx, etc.
```

## Alternative: Using a Reverse Proxy

If you're running multiple applications, consider using a reverse proxy:

### Traefik
```yaml
# Add to compose.prod.yml
services:
  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.clademusic.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.clademusic.entrypoints=websecure"
      - "traefik.http.routers.clademusic.tls.certresolver=letsencrypt"
```

### Nginx Proxy Manager
Use the web interface to configure your domain and SSL certificates.

## Support

For issues or questions:
- Check application logs: `docker compose -f compose.prod.yml logs`
- Verify nginx config: `docker compose -f compose.prod.yml exec web nginx -t`
- Test connectivity: `curl -v https://your-domain.com`
