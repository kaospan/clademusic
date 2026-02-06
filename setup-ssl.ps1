# SSL Setup Script for CladeMusic (Windows PowerShell)
# This script helps you set up SSL certificates

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "getclade.net"
)

Write-Host "Setting up SSL for domain: $Domain" -ForegroundColor Green

# Create SSL directory if it doesn't exist
New-Item -ItemType Directory -Force -Path ".\ssl" | Out-Null

Write-Host "`nSSL Certificate Setup Options:" -ForegroundColor Yellow
Write-Host "1. Use existing certificate files (cert.pem and key.pem)"
Write-Host "2. Generate self-signed certificate (for testing)"
Write-Host "3. Manual setup instructions for Let's Encrypt"
Write-Host ""

$choice = Read-Host "Select option (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`nPlace your certificate files in the .\ssl directory:" -ForegroundColor Cyan
        Write-Host "  - cert.pem (certificate + intermediate chain)"
        Write-Host "  - key.pem (private key)"
        Write-Host ""
        Read-Host "Press Enter when files are ready..."
        
        if ((Test-Path ".\ssl\cert.pem") -and (Test-Path ".\ssl\key.pem")) {
            Write-Host "Certificate files found!" -ForegroundColor Green
        } else {
            Write-Host "Error: Certificate files not found!" -ForegroundColor Red
            exit 1
        }
    }
    "2" {
        Write-Host "`nGenerating self-signed certificate..." -ForegroundColor Cyan
        
        # Generate self-signed certificate using OpenSSL (if available)
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
                -keyout ".\ssl\key.pem" `
                -out ".\ssl\cert.pem" `
                -subj "/C=US/ST=State/L=City/O=Organization/CN=$Domain"
            Write-Host "Self-signed certificate generated!" -ForegroundColor Green
        } else {
            Write-Host "OpenSSL not found. Install it or use option 1 or 3." -ForegroundColor Red
            exit 1
        }
    }
    "3" {
        Write-Host "`nManual Let's Encrypt Setup Instructions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Install Certbot (on Linux/WSL):"
        Write-Host "   sudo apt-get install certbot"
        Write-Host ""
        Write-Host "2. Obtain certificate:"
        Write-Host "   sudo certbot certonly --standalone -d $Domain -d www.$Domain"
        Write-Host ""
        Write-Host "3. Copy certificates to .\ssl directory:"
        Write-Host "   cp /etc/letsencrypt/live/$Domain/fullchain.pem ./ssl/cert.pem"
        Write-Host "   cp /etc/letsencrypt/live/$Domain/privkey.pem ./ssl/key.pem"
        Write-Host ""
        Write-Host "4. Update nginx.conf with your domain"
        Write-Host "5. Run: docker compose -f compose.prod.yml up -d"
        Write-Host ""
        exit 0
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Edit nginx.conf and uncomment the HTTPS server block"
Write-Host "2. Replace 'your-domain.com' with '$Domain' in nginx.conf"
Write-Host "3. Run: docker compose -f compose.prod.yml up -d"
Write-Host ""
