#!/bin/bash
export SSHPASS='gdmiLWVV4012'
SERVER="root@149.88.90.108"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

echo "==== Configuring Server (CentOS 9) ===="
sshpass -e ssh $SSH_OPTS $SERVER << 'EOF'
dnf install -y epel-release
dnf install -y nginx java-21-openjdk-headless

# Setup Nginx
cat >/etc/nginx/conf.d/watch-shop.conf <<'NGNXEOF'
server {
  listen 80;
  server_name 149.88.90.108;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin/ {
    alias /var/www/watch_shop/admin/;
    try_files $uri $uri/ /admin/index.html;
  }

  location / {
    alias /var/www/watch_shop/front/;
    try_files $uri $uri/ /index.html;
  }
}
NGNXEOF

# Fix permissions for SELinux if needed, but we'll try without first, or just setsebool
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
# Ensure nginx can read the directories
chmod -R 755 /var/www/watch_shop

systemctl enable --now nginx
nginx -t && systemctl reload nginx

# Restart backend to be sure
systemctl restart watch-shop-backend

# Open port 80 in firewall
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
EOF

echo "==== Deployment Complete! ===="
