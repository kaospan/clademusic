#!/bin/bash

# SSL Setup Script for CladeMusic
# This script helps you set up SSL certificates using Let's Encrypt (Certbot)

set -e

DOMAIN=${1:-"getclade.net"}

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh [domain]"
    echo "Default domain: getclade.net"
    exit 1
fi

echo "Setting up SSL for domain: $DOMAIN"

# Create SSL directory if it doesn't exist
mkdir -p ./ssl

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Certbot is not installed. Please install it first:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot"
    echo "  macOS: brew install certbot"
    echo "  Windows: Use WSL or install from https://certbot.eff.org/"
    exit 1
fi

echo "Obtaining SSL certificate for $DOMAIN..."
echo "Make sure:"
echo "  1. Your domain DNS points to this server's IP"
echo "  2. Ports 80 and 443 are accessible"
echo "  3. No other web server is running on port 80"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Stop the container if running
docker compose down 2>/dev/null || true

# Obtain certificate using standalone mode
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@$DOMAIN" \
    --preferred-challenges http

# Copy certificates to SSL directory
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ./ssl/cert.pem
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ./ssl/key.pem
sudo chmod 644 ./ssl/cert.pem
sudo chmod 600 ./ssl/key.pem
sudo chown $(whoami):$(whoami) ./ssl/*.pem

echo "SSL certificates installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Edit nginx.conf and uncomment the HTTPS server block"
echo "  2. Replace 'your-domain.com' with '$DOMAIN' in nginx.conf"
echo "  3. Run: docker compose -f compose.prod.yml up -d"
echo ""
echo "To renew certificates automatically, add to crontab:"
echo "  0 0 * * * certbot renew --quiet && docker compose -f compose.prod.yml restart"
