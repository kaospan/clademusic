# getclade.net Deployment Guide

Your application is now configured for **getclade.net**. Follow these steps to deploy.

## Prerequisites Checklist

- [ ] Domain `getclade.net` is registered and under your control
- [ ] Server with public IP address
- [ ] Docker and Docker Compose installed
- [ ] Ports 80 and 443 are open in firewall

## Step 1: DNS Configuration

Add these DNS records for `getclade.net`:

```
Type    Name    Value               TTL
A       @       [your-server-ip]    3600
A       www     [your-server-ip]    3600
```

**Verify DNS propagation:**
```bash
# Windows
nslookup getclade.net

# Linux/Mac
dig getclade.net
```

## Step 2: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

**Windows PowerShell:**
```powershell
.\setup-ssl.ps1 -Domain getclade.net
```

**Linux/Mac:**
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh getclade.net
```

### Option B: Self-Signed (Testing Only)

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Clade/CN=getclade.net"
```

### Option C: Existing Certificate

Place your certificate files:
- `ssl/cert.pem` - Certificate + chain
- `ssl/key.pem` - Private key

## Step 3: Build and Deploy

```bash
# Stop any existing containers
docker compose down

# Build the image
docker build -t clademusic:latest .

# Start with production config
docker compose -f compose.prod.yml up -d

# Check status
docker compose -f compose.prod.yml ps

# View logs
docker compose -f compose.prod.yml logs -f web
```

## Step 4: Verify Deployment

### Test HTTPS
```bash
curl -I https://getclade.net
```

### Test HTTP Redirect
```bash
curl -I http://getclade.net
```

### Check SSL Certificate
```bash
openssl s_client -connect getclade.net:443 -servername getclade.net
```

### Browser Test
Visit: https://getclade.net

## Step 5: Firewall Configuration

### Windows (if running server on Windows)
```powershell
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

### Ubuntu/Debian
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Cloud Provider Firewall
- **AWS**: Add inbound rules for ports 80, 443 to Security Group
- **Google Cloud**: Create firewall rule allowing tcp:80,443
- **Azure**: Add inbound security rules for ports 80, 443
- **DigitalOcean**: Configure Firewall to allow HTTP and HTTPS

## Monitoring and Maintenance

### View Logs
```bash
docker compose -f compose.prod.yml logs -f
```

### Restart Application
```bash
docker compose -f compose.prod.yml restart
```

### Update Application
```bash
git pull
docker compose -f compose.prod.yml up -d --build
```

### SSL Certificate Renewal

**Automated (recommended):**
```bash
# Add to crontab (Linux/Mac)
crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && cd /path/to/clademusic && docker compose -f compose.prod.yml restart
```

**Manual:**
```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/getclade.net/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/getclade.net/privkey.pem ./ssl/key.pem
docker compose -f compose.prod.yml restart
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose -f compose.prod.yml logs

# Test nginx config
docker compose -f compose.prod.yml run --rm web nginx -t
```

### SSL Certificate errors
```bash
# Verify certificate files exist
ls -la ssl/

# Check file permissions
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem
```

### Port already in use
```bash
# Windows - Find process
netstat -ano | findstr :80
netstat -ano | findstr :443

# Linux - Find and stop process
sudo lsof -i :80
sudo lsof -i :443
```

### DNS not resolving
- Wait up to 48 hours for full DNS propagation
- Clear DNS cache:
  - Windows: `ipconfig /flushdns`
  - Linux: `sudo systemd-resolve --flush-caches`
  - Mac: `sudo dscacheutil -flushcache`

### Application not loading
1. Check container is running: `docker compose -f compose.prod.yml ps`
2. Check logs: `docker compose -f compose.prod.yml logs`
3. Test nginx: `docker compose -f compose.prod.yml exec web nginx -t`
4. Verify ports are mapped: `docker compose -f compose.prod.yml port web 80`

## Production Checklist

Before going live:

- [ ] DNS is propagated and resolving correctly
- [ ] SSL certificate is valid and trusted
- [ ] HTTPS is working (https://getclade.net)
- [ ] HTTP redirects to HTTPS
- [ ] Application loads correctly
- [ ] All pages/routes work properly
- [ ] Static assets are cached
- [ ] Security headers are present
- [ ] Firewall allows ports 80 and 443
- [ ] Monitoring/logging is set up
- [ ] Backup strategy is in place
- [ ] SSL renewal automation is configured

## Performance Optimization

### Enable HTTP/2 (already configured)
HTTP/2 is enabled in nginx.conf for better performance.

### CDN Integration (optional)
Consider using Cloudflare or AWS CloudFront:
- Point DNS to CDN
- Configure CDN to proxy to your server
- Enable CDN caching rules

### Database Connection (if using Supabase)
Update `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then rebuild:
```bash
docker compose -f compose.prod.yml up -d --build
```

## Support Commands

```bash
# Stop application
docker compose -f compose.prod.yml down

# View resource usage
docker stats

# Execute command in container
docker compose -f compose.prod.yml exec web sh

# Backup SSL certificates
tar -czf ssl-backup-$(date +%Y%m%d).tar.gz ssl/

# Clean up Docker resources
docker system prune -a
```

## Next Steps

1. Set up monitoring (e.g., UptimeRobot, Pingdom)
2. Configure backup automation
3. Set up CI/CD pipeline for automated deployments
4. Configure analytics (Google Analytics, Plausible)
5. Set up error tracking (Sentry)

Your application is now live at **https://getclade.net**! 🎉
