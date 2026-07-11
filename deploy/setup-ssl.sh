#!/bin/bash
set -euo pipefail

sudo mkdir -p /etc/nginx/ssl

if [ ! -f /etc/nginx/ssl/party-games.crt ]; then
  sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/party-games.key \
    -out /etc/nginx/ssl/party-games.crt \
    -subj "/CN=54.65.228.227"
  sudo chmod 600 /etc/nginx/ssl/party-games.key
  sudo chmod 644 /etc/nginx/ssl/party-games.crt
fi

sudo cp ~/party-games/deploy/nginx-party-games-ssl.conf /etc/nginx/conf.d/party-games-ssl.conf
sudo nginx -t
sudo systemctl reload nginx

echo "HTTPS enabled on port 443"
