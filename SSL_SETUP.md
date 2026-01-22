# SSL/HTTPS Setup Guide for FleetFlow

This guide will help you set up SSL/HTTPS for your FleetFlow application using Let's Encrypt certificates.

## Prerequisites

1. **Domain Name**: Your domain (`fleet-flow.duckdns.org`) must be pointing to your server's IP address
2. **Port 80 & 443**: Ensure ports 80 and 443 are open in your firewall
3. **Docker & Docker Compose**: Already installed (based on your setup)

## Quick Start

### Option 1: Using Docker (Recommended - No local certbot installation)

**Linux/macOS:**
```bash
# Email is already set to sarthaksharma0234@gmail.com in the script
# Or override with: export SSL_EMAIL="your-email@example.com"

# Run the setup script
chmod +x scripts/setup_ssl_docker.sh
./scripts/setup_ssl_docker.sh
```

**Windows PowerShell:**
```powershell
# Email is already set to sarthaksharma0234@gmail.com in the script
# Or override with: $env:SSL_EMAIL="your-email@example.com"

# Run the setup script
.\scripts\setup_ssl.ps1
```

### Option 2: Using Local Certbot

```bash
# Install certbot (if not already installed)
# On Ubuntu/Debian:
sudo apt-get update && sudo apt-get install -y certbot

# On macOS:
brew install certbot

# Email is already set to sarthaksharma0234@gmail.com in the script
# Or override with: export SSL_EMAIL="your-email@example.com"

# Run the setup script
chmod +x scripts/setup_ssl.sh
./scripts/setup_ssl.sh
```

## Manual Setup

If you prefer to set up SSL manually:

### Step 1: Create SSL Directories

```bash
mkdir -p ssl
mkdir -p certbot/www
mkdir -p certbot/conf
```

### Step 2: Obtain Certificates

**Using Docker:**
```bash
docker run --rm \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email sarthaksharma0234@gmail.com \
    -d fleet-flow.duckdns.org
```

**Using Local Certbot:**
```bash
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email sarthaksharma0234@gmail.com \
    -d fleet-flow.duckdns.org
```

### Step 3: Copy Certificates

**If using Docker:**
```bash
cp certbot/conf/live/fleet-flow.duckdns.org/fullchain.pem ssl/fullchain.pem
cp certbot/conf/live/fleet-flow.duckdns.org/privkey.pem ssl/privkey.pem
```

**If using Local Certbot:**
```bash
sudo cp /etc/letsencrypt/live/fleet-flow.duckdns.org/fullchain.pem ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/fleet-flow.duckdns.org/privkey.pem ssl/privkey.pem
sudo chmod 644 ssl/fullchain.pem
sudo chmod 600 ssl/privkey.pem
```

### Step 4: Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

### Using Docker (Recommended)

**Linux/macOS - Add to crontab:**
```bash
crontab -e
```

Add this line (runs daily at 3 AM):
```
0 3 * * * cd /path/to/fleetflow && ./scripts/renew_ssl_docker.sh
```

**Windows - Use Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to Daily at 3:00 AM
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\fleetflow\scripts\renew_ssl.ps1"`

### Using Local Certbot

Add to crontab:
```bash
crontab -e
```

Add this line:
```
0 3 * * * cd /path/to/fleetflow && ./scripts/renew_ssl.sh
```

Or use certbot's built-in renewal:
```
0 3 * * * certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart frontend
```

## Testing SSL

1. **Check Certificate:**
   ```bash
   openssl s_client -connect fleet-flow.duckdns.org:443 -servername fleet-flow.duckdns.org
   ```

2. **Online Tools:**
   - [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
   - [SSL Checker](https://www.sslshopper.com/ssl-checker.html)

3. **Browser Test:**
   - Visit `https://fleet-flow.duckdns.org`
   - Check for the padlock icon in the address bar

## Troubleshooting

### Port 80 Already in Use

If port 80 is already in use, stop the conflicting service:
```bash
# Find what's using port 80
sudo lsof -i :80
# or
sudo netstat -tulpn | grep :80

# Stop the service or use webroot method instead
```

### Certificate Renewal Fails

1. Ensure port 80 is accessible
2. Check domain DNS is pointing correctly
3. Verify nginx is running
4. Check certificate expiration: `openssl x509 -in ssl/fullchain.pem -noout -dates`

### Nginx Can't Find Certificates

1. Verify certificates exist: `ls -la ssl/`
2. Check file permissions: `chmod 644 ssl/fullchain.pem && chmod 600 ssl/privkey.pem`
3. Ensure docker-compose volumes are mounted correctly

### Mixed Content Warnings

If you see mixed content warnings, ensure:
1. All API calls use HTTPS
2. Update `VITE_API_URL` in your `.env` to use `https://`
3. Update `CLIENT_URL` and `CORS_ORIGIN` in backend `.env` to use `https://`

## Security Best Practices

1. **Keep Certificates Updated**: Set up automatic renewal
2. **Use Strong Ciphers**: Already configured in `nginx.conf`
3. **Enable HSTS**: Already configured in `nginx.conf`
4. **Regular Security Audits**: Use SSL Labs to check your configuration
5. **Monitor Expiration**: Set up alerts for certificate expiration

## File Structure

After setup, your directory structure should look like:

```
fleetflow/
├── ssl/
│   ├── fullchain.pem    # SSL certificate chain
│   └── privkey.pem      # Private key
├── certbot/
│   ├── www/             # Webroot for validation
│   └── conf/            # Let's Encrypt configuration
├── nginx.conf           # Updated with SSL config
└── docker-compose.prod.yml  # Updated with SSL volumes
```

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

