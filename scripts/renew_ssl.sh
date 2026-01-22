#!/bin/bash

# SSL Certificate Renewal Script for FleetFlow
# This script renews Let's Encrypt SSL certificates

set -e

DOMAIN="fleet-flow.duckdns.org"
SSL_DIR="./ssl"

echo "🔄 Renewing SSL certificates for $DOMAIN"

# Check if certbot is available
if ! command -v certbot &> /dev/null; then
    echo "❌ certbot is not installed. Please install it first."
    exit 1
fi

# Renew certificates
echo "📜 Renewing certificates..."
sudo certbot renew --quiet

# Copy renewed certificates to SSL directory
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "📋 Copying renewed certificates to $SSL_DIR..."
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    sudo chmod 644 "$SSL_DIR/fullchain.pem"
    sudo chmod 600 "$SSL_DIR/privkey.pem"
    sudo chown $USER:$USER "$SSL_DIR"/*.pem 2>/dev/null || true
    
    echo "🔄 Reloading nginx..."
    docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload || \
    docker-compose -f docker-compose.prod.yml restart frontend
    
    echo "✅ Certificates renewed successfully!"
else
    echo "❌ Failed to find renewed certificates"
    exit 1
fi

