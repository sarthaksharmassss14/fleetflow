#!/bin/bash

# SSL Certificate Setup Script for FleetFlow
# This script sets up Let's Encrypt SSL certificates using certbot

set -e

DOMAIN="13-211-252-48.sslip.io"
EMAIL="${SSL_EMAIL:-sarthaksharma0234@gmail.com}"  # Set SSL_EMAIL env var or change default
SSL_DIR="./ssl"
CERTBOT_DIR="./certbot"

echo "🔐 Setting up SSL certificates for $DOMAIN"

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
        docker-compose -f docker-compose.prod.yml run --rm certbot renew
        exit 0
    else
        echo "✅ Using existing certificates"
        exit 0
    fi
fi

# Check if certbot is available
if ! command -v certbot &> /dev/null; then
    echo "❌ certbot is not installed. Installing certbot..."
    
    # Detect OS and install certbot
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        else
            echo "❌ Please install certbot manually: https://certbot.eff.org/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install certbot
        else
            echo "❌ Please install certbot manually: brew install certbot"
            exit 1
        fi
    else
        echo "❌ Please install certbot manually: https://certbot.eff.org/"
        exit 1
    fi
fi

# Start nginx temporarily for certificate validation
echo "🚀 Starting nginx container for certificate validation..."
docker-compose -f docker-compose.prod.yml up -d frontend

# Wait for nginx to be ready
echo "⏳ Waiting for nginx to be ready..."
sleep 5

# Obtain certificate using standalone mode (requires port 80 to be free)
echo "📜 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --cert-path "$SSL_DIR" \
    --key-path "$SSL_DIR" \
    --fullchain-path "$SSL_DIR/fullchain.pem" \
    --privkey-path "$SSL_DIR/privkey.pem"

# Alternative: Use webroot method (if nginx is running)
# sudo certbot certonly \
#     --webroot \
#     --webroot-path="$CERTBOT_DIR/www" \
#     --non-interactive \
#     --agree-tos \
#     --email "$EMAIL" \
#     -d "$DOMAIN"

# Copy certificates to SSL directory
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "📋 Copying certificates to $SSL_DIR..."
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    sudo chmod 644 "$SSL_DIR/fullchain.pem"
    sudo chmod 600 "$SSL_DIR/privkey.pem"
    sudo chown $USER:$USER "$SSL_DIR"/*.pem 2>/dev/null || true
fi

echo "✅ SSL certificates have been set up successfully!"
echo "🔒 Certificates are located in: $SSL_DIR"
echo ""
echo "📝 Next steps:"
echo "1. Restart your containers: docker-compose -f docker-compose.prod.yml restart frontend"
echo "2. Set up automatic renewal (see scripts/renew_ssl.sh)"
echo "3. Visit https://$DOMAIN to verify SSL is working"

