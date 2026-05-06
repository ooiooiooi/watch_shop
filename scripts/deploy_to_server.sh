#!/bin/bash
export SSHPASS='gdmiLWVV4012'
SERVER="root@149.88.90.108"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

echo "==== 1. Creating remote directories ===="
sshpass -e ssh $SSH_OPTS $SERVER "mkdir -p /var/www/watch_shop/front /var/www/watch_shop/admin /opt/watch_shop/backend"

echo "==== 2. Uploading Frontend ===="
sshpass -e scp $SSH_OPTS -r /Users/mac/workspace/watch_shop/watch_shop_front/dist/* $SERVER:/var/www/watch_shop/front/

echo "==== 3. Uploading Admin ===="
sshpass -e scp $SSH_OPTS -r /Users/mac/workspace/watch_shop/watch_shop_admin/dist/* $SERVER:/var/www/watch_shop/admin/

echo "==== 4. Uploading Backend ===="
sshpass -e scp $SSH_OPTS /Users/mac/workspace/watch_shop/watch_shop_backend/target/watch-shop-backend-0.0.1-SNAPSHOT.jar $SERVER:/opt/watch_shop/backend/app.jar

echo "==== 5. Configuring Server ===="
sshpass -e ssh $SSH_OPTS $SERVER << 'EOF'
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx openjdk-21-jre-headless

# Setup backend env
cat >/opt/watch_shop/backend/app.env <<'ENVEOF'
SPRING_PROFILES_ACTIVE=prod
APP_JWT_SECRET=super_secret_jwt_key_for_production_use_only_1234567890
APP_CORS_ALLOWED_ORIGINS=http://149.88.90.108,https://149.88.90.108
ENVEOF

# Setup Systemd
cat >/etc/systemd/system/watch-shop-backend.service <<'SVCEOF'
[Unit]
Description=watch-shop-backend
After=network.target

[Service]
WorkingDirectory=/opt/watch_shop/backend
EnvironmentFile=/opt/watch_shop/backend/app.env
ExecStart=/usr/bin/java -jar /opt/watch_shop/backend/app.jar
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable --now watch-shop-backend
systemctl restart watch-shop-backend

# Setup Nginx
cat >/etc/nginx/sites-available/watch-shop <<'NGNXEOF'
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

ln -sf /etc/nginx/sites-available/watch-shop /etc/nginx/sites-enabled/watch-shop
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
EOF

echo "==== Deployment Complete! ===="
