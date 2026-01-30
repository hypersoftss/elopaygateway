#!/bin/bash

# ============================================================
# ELOPAY Gateway - Complete VPS Deployment Script
# ============================================================
# यह script आपके VPS पर पूरा ELOPAY Gateway deploy कर देगा
# Run: chmod +x VPS_DEPLOYMENT_SCRIPT.sh && sudo ./VPS_DEPLOYMENT_SCRIPT.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 ELOPAY Gateway VPS Setup                      ║"
echo "║                    Free Deployment Script                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# STEP 1: Get User Configuration
# ============================================================

echo -e "${YELLOW}📝 Configuration Setup${NC}"
echo "-----------------------------------"

read -p "Enter your domain (e.g., pay.yourdomain.com): " DOMAIN
read -p "Enter your email for SSL: " EMAIL
read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_KEY
read -p "Enter your GitHub repo URL (or press Enter to skip): " GITHUB_REPO

# Extract project ID from Supabase URL
SUPABASE_PROJECT_ID=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

echo -e "\n${GREEN}✓ Configuration saved${NC}\n"

# ============================================================
# STEP 2: System Update & Essential Packages
# ============================================================

echo -e "${YELLOW}📦 Installing system packages...${NC}"

apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban unzip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Bun (faster than npm)
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo -e "${GREEN}✓ System packages installed${NC}\n"

# ============================================================
# STEP 3: Security Hardening
# ============================================================

echo -e "${YELLOW}🔒 Configuring security...${NC}"

# Configure UFW Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Configure Fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo -e "${GREEN}✓ Security configured (UFW + Fail2ban)${NC}\n"

# ============================================================
# STEP 4: Create Application Directory
# ============================================================

echo -e "${YELLOW}📁 Setting up application directory...${NC}"

APP_DIR="/var/www/elopay"
mkdir -p $APP_DIR
cd $APP_DIR

# If GitHub repo provided, clone it
if [ -n "$GITHUB_REPO" ]; then
    echo "Cloning from GitHub..."
    git clone $GITHUB_REPO .
else
    echo "Creating placeholder structure..."
    mkdir -p dist
    echo "<h1>ELOPAY Gateway - Upload your build files</h1>" > dist/index.html
fi

# Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
EOF

echo -e "${GREEN}✓ Application directory ready: $APP_DIR${NC}\n"

# ============================================================
# STEP 5: Build Application (if source code exists)
# ============================================================

if [ -f "package.json" ]; then
    echo -e "${YELLOW}🔨 Building application...${NC}"
    
    # Install dependencies
    bun install
    
    # Build for production
    bun run build
    
    echo -e "${GREEN}✓ Application built${NC}\n"
fi

# ============================================================
# STEP 6: Configure Nginx
# ============================================================

echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/elopay << EOF
# ELOPAY Gateway - Nginx Configuration
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL will be configured by Certbot
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;" always;

    # Root directory
    root $APP_DIR/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Block sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ ^/(\.env|package\.json|node_modules) {
        deny all;
    }

    # Proxy Supabase Edge Functions (optional)
    location /api/ {
        proxy_pass $SUPABASE_URL/functions/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/elopay /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}\n"

# ============================================================
# STEP 7: SSL Certificate (Let's Encrypt)
# ============================================================

echo -e "${YELLOW}🔐 Setting up SSL certificate...${NC}"

# Get SSL certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

# Auto-renewal cron
echo "0 0,12 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew

echo -e "${GREEN}✓ SSL certificate installed${NC}\n"

# ============================================================
# STEP 8: Create Management Scripts
# ============================================================

echo -e "${YELLOW}📜 Creating management scripts...${NC}"

# Deploy script
cat > $APP_DIR/deploy.sh << 'DEPLOY'
#!/bin/bash
cd /var/www/elopay
git pull origin main
bun install
bun run build
sudo systemctl reload nginx
echo "✓ Deployment complete!"
DEPLOY
chmod +x $APP_DIR/deploy.sh

# Restart script
cat > $APP_DIR/restart.sh << 'RESTART'
#!/bin/bash
sudo systemctl restart nginx
sudo systemctl restart fail2ban
echo "✓ Services restarted!"
RESTART
chmod +x $APP_DIR/restart.sh

# Status script
cat > $APP_DIR/status.sh << 'STATUS'
#!/bin/bash
echo "=== ELOPAY Gateway Status ==="
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l | head -5
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "SSL Certificate Expiry:"
certbot certificates 2>/dev/null | grep -A2 "Expiry Date"
STATUS
chmod +x $APP_DIR/status.sh

echo -e "${GREEN}✓ Management scripts created${NC}\n"

# ============================================================
# STEP 9: Set Permissions
# ============================================================

echo -e "${YELLOW}🔧 Setting permissions...${NC}"

chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo -e "${GREEN}✓ Permissions set${NC}\n"

# ============================================================
# STEP 10: Final Summary
# ============================================================

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🎉 DEPLOYMENT COMPLETE! 🎉                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Your ELOPAY Gateway is now live!${NC}\n"

echo "📍 Access Points:"
echo "   Website: https://$DOMAIN"
echo "   Admin:   https://$DOMAIN/xp7k9m2v-admin"
echo "   Merchant: https://$DOMAIN/merchant-login"
echo ""

echo "📁 Important Paths:"
echo "   App Directory: $APP_DIR"
echo "   Nginx Config: /etc/nginx/sites-available/elopay"
echo "   SSL Certs: /etc/letsencrypt/live/$DOMAIN/"
echo ""

echo "🛠️ Management Commands:"
echo "   Deploy updates: $APP_DIR/deploy.sh"
echo "   Restart services: $APP_DIR/restart.sh"
echo "   Check status: $APP_DIR/status.sh"
echo ""

echo "🔐 Security:"
echo "   - UFW Firewall: ACTIVE (ports 22, 80, 443)"
echo "   - Fail2ban: ACTIVE (SSH + Nginx protection)"
echo "   - SSL: ACTIVE (auto-renews)"
echo ""

echo "⚠️ NEXT STEPS:"
echo "   1. Upload your build files to $APP_DIR/dist/ (if not using GitHub)"
echo "   2. Set up Supabase secrets for Edge Functions"
echo "   3. Configure Telegram bot token"
echo "   4. Create your first admin account at /setup-admin"
echo ""

echo -e "${YELLOW}📖 Full documentation: $APP_DIR/public/docs/${NC}"
echo ""
