#!/bin/bash

# SSL Certificate Renewal Script using Docker
# This script renews Let's Encrypt SSL certificates using certbot in Docker

set -e

DOMAIN="fleet-flow.duckdns.org"
SSL_DIR="./ssl"
CERTBOT_DIR="./certbot"

echo "🔄 Renewing SSL certificates for $DOMAIN using Docker"

# Renew certificates using Docker
echo "📜 Renewing certificates..."
docker run --rm \
    -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
    -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
    certbot/certbot renew --quiet

# Copy renewed certificates to SSL directory
if [ -f "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "📋 Copying renewed certificates to $SSL_DIR..."
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    
    echo "🔄 Reloading nginx..."
    docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload || \
    docker-compose -f docker-compose.prod.yml restart frontend
    
    echo "✅ Certificates renewed successfully!"
else
    echo "❌ Failed to find renewed certificates"
    exit 1
fi

