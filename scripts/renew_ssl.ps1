# SSL Certificate Renewal Script for FleetFlow (Windows PowerShell)
# This script renews Let's Encrypt SSL certificates using certbot in Docker

$ErrorActionPreference = "Stop"

$DOMAIN = "fleet-flow.duckdns.org"
$SSL_DIR = ".\ssl"
$CERTBOT_DIR = ".\certbot"

Write-Host "🔄 Renewing SSL certificates for $DOMAIN using Docker" -ForegroundColor Cyan

# Renew certificates using Docker
Write-Host "📜 Renewing certificates..." -ForegroundColor Yellow
docker run --rm `
    -v "${PWD}\$CERTBOT_DIR\www:/var/www/certbot" `
    -v "${PWD}\$CERTBOT_DIR\conf:/etc/letsencrypt" `
    certbot/certbot renew --quiet

# Copy renewed certificates to SSL directory
$fullchainPath = "$CERTBOT_DIR\conf\live\$DOMAIN\fullchain.pem"
if (Test-Path $fullchainPath) {
    Write-Host "📋 Copying renewed certificates to $SSL_DIR..." -ForegroundColor Yellow
    Copy-Item $fullchainPath "$SSL_DIR\fullchain.pem"
    Copy-Item "$CERTBOT_DIR\conf\live\$DOMAIN\privkey.pem" "$SSL_DIR\privkey.pem"
    
    Write-Host "🔄 Reloading nginx..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload
    
    if ($LASTEXITCODE -ne 0) {
        docker-compose -f docker-compose.prod.yml restart frontend
    }
    
    Write-Host "✅ Certificates renewed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to find renewed certificates" -ForegroundColor Red
    exit 1
}

