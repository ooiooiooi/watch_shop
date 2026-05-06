#!/bin/bash
SERVER="root@149.88.90.108"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

if [ -z "${SSHPASS:-}" ]; then
  echo "SSHPASS is required"
  exit 1
fi

echo "==== 1. Cleanup previous attempts ===="
sshpass -e ssh $SSH_OPTS $SERVER << 'EOF'
systemctl stop watch-shop-backend 2>/dev/null || true
systemctl disable watch-shop-backend 2>/dev/null || true
rm -f /etc/systemd/system/watch-shop-backend.service
systemctl daemon-reload
killall java 2>/dev/null || true
EOF

echo "==== 2. Uploading Frontend ===="
# Clear existing to avoid stale files
sshpass -e ssh $SSH_OPTS $SERVER "rm -rf /www/wwwroot/vsfactory/*"
sshpass -e scp $SSH_OPTS -r /Users/mac/workspace/watch_shop/watch_shop_front/dist/* $SERVER:/www/wwwroot/vsfactory/

echo "==== 3. Uploading Admin ===="
sshpass -e ssh $SSH_OPTS $SERVER "mkdir -p /www/wwwroot/vsfactory/admin"
sshpass -e scp $SSH_OPTS -r /Users/mac/workspace/watch_shop/watch_shop_admin/dist/* $SERVER:/www/wwwroot/vsfactory/admin/

echo "==== 4. Uploading Backend ===="
sshpass -e ssh $SSH_OPTS $SERVER "mkdir -p /opt/watch_shop/uploads"
sshpass -e scp $SSH_OPTS /Users/mac/workspace/watch_shop/watch_shop_backend/target/watch-shop-backend-0.0.1-SNAPSHOT.jar $SERVER:/opt/watch_shop/app.jar

echo "==== 5. Starting Backend ===="
sshpass -e ssh $SSH_OPTS $SERVER << 'EOF'
cd /opt/watch_shop
# Make sure start.sh is executable
chmod +x start.sh
# Export prod variables in the script context or just run it with default profile (since we know it works)
# Actually, let's just run their script
./start.sh
sleep 5
# Check if it started
ps aux | grep java
EOF

echo "==== Deployment Complete! ===="
