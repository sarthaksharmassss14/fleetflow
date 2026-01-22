#!/bin/bash

# SSL Certificate Setup Script using Docker (No local certbot required)
# This script sets up Let's Encrypt SSL certificates using certbot in Docker

set -e

DOMAIN="fleet-flow.duckdns.org"
EMAIL="${SSL_EMAIL:-sarthaksharma0234@gmail.com}"
SSL_DIR="./ssl"
CERTBOT_DIR="./certbot"

echo "🔐 Setting up SSL certificates for $DOMAIN using Docker"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p "$SSL_DIR"
mkdir -p "$CERTBOT_DIR/www"
mkdir -p "$CERTBOT_DIR/conf"

# Check if certificates already exist
if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
    echo "⚠️  SSL certificates already exist in $SSL_DIR"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Renewing certificates..."
        docker run --rm \
            -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
            -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
            certbot/certbot renew
        exit 0
    else
        echo "✅ Using existing certificates"
        exit 0
    fi
fi

# Start nginx temporarily for certificate validation
echo "🚀 Starting nginx container for certificate validation..."
docker-compose -f docker-compose.prod.yml up -d frontend

# Wait for nginx to be ready
echo "⏳ Waiting for nginx to be ready..."
sleep 5

# Obtain certificate using certbot Docker image
echo "📜 Obtaining SSL certificate from Let's Encrypt using Docker..."
docker run --rm \
    -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
    -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Copy certificates to SSL directory
if [ -f "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "📋 Copying certificates to $SSL_DIR..."
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    
    echo "✅ SSL certificates have been set up successfully!"
    echo "🔒 Certificates are located in: $SSL_DIR"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your containers: docker-compose -f docker-compose.prod.yml restart frontend"
    echo "2. Set up automatic renewal (add to crontab: 0 3 * * * $(pwd)/scripts/renew_ssl_docker.sh)"
    echo "3. Visit https://$DOMAIN to verify SSL is working"
else
    echo "❌ Failed to obtain certificates. Please check the error messages above."
    exit 1
fi

