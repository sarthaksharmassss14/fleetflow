# SSL Certificate Setup Script for FleetFlow (Windows PowerShell)
# This script sets up Let's Encrypt SSL certificates using certbot in Docker

$ErrorActionPreference = "Stop"

$DOMAIN = "fleet-flow.duckdns.org"
$EMAIL = if ($env:SSL_EMAIL) { $env:SSL_EMAIL } else { "sarthaksharma0234@gmail.com" }
$SSL_DIR = ".\ssl"
$CERTBOT_DIR = ".\certbot"

Write-Host "🔐 Setting up SSL certificates for $DOMAIN using Docker" -ForegroundColor Cyan

# Create necessary directories
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $SSL_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "$CERTBOT_DIR\www" | Out-Null
New-Item -ItemType Directory -Force -Path "$CERTBOT_DIR\conf" | Out-Null

# Check if certificates already exist
if ((Test-Path "$SSL_DIR\fullchain.pem") -and (Test-Path "$SSL_DIR\privkey.pem")) {
    Write-Host "⚠️  SSL certificates already exist in $SSL_DIR" -ForegroundColor Yellow
    $response = Read-Host "Do you want to renew them? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "🔄 Renewing certificates..." -ForegroundColor Yellow
        docker run --rm `
            -v "${PWD}\$CERTBOT_DIR\www:/var/www/certbot" `
            -v "${PWD}\$CERTBOT_DIR\conf:/etc/letsencrypt" `
            certbot/certbot renew
        exit 0
    } else {
        Write-Host "✅ Using existing certificates" -ForegroundColor Green
        exit 0
    }
}

# Start nginx temporarily for certificate validation
Write-Host "🚀 Starting nginx container for certificate validation..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d frontend

# Wait for nginx to be ready
Write-Host "⏳ Waiting for nginx to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Obtain certificate using certbot Docker image
Write-Host "📜 Obtaining SSL certificate from Let's Encrypt using Docker..." -ForegroundColor Yellow
docker run --rm `
    -v "${PWD}\$CERTBOT_DIR\www:/var/www/certbot" `
    -v "${PWD}\$CERTBOT_DIR\conf:/etc/letsencrypt" `
    -p 80:80 `
    certbot/certbot certonly `
    --standalone `
    --non-interactive `
    --agree-tos `
    --email $EMAIL `
    -d $DOMAIN

# Copy certificates to SSL directory
$fullchainPath = "$CERTBOT_DIR\conf\live\$DOMAIN\fullchain.pem"
if (Test-Path $fullchainPath) {
    Write-Host "📋 Copying certificates to $SSL_DIR..." -ForegroundColor Yellow
    Copy-Item $fullchainPath "$SSL_DIR\fullchain.pem"
    Copy-Item "$CERTBOT_DIR\conf\live\$DOMAIN\privkey.pem" "$SSL_DIR\privkey.pem"
    
    Write-Host "✅ SSL certificates have been set up successfully!" -ForegroundColor Green
    Write-Host "🔒 Certificates are located in: $SSL_DIR" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your containers: docker-compose -f docker-compose.prod.yml restart frontend"
    Write-Host "2. Set up automatic renewal (see SSL_SETUP.md)"
    Write-Host "3. Visit https://$DOMAIN to verify SSL is working"
} else {
    Write-Host "❌ Failed to obtain certificates. Please check the error messages above." -ForegroundColor Red
    exit 1
}

