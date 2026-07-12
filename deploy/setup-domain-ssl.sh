#!/bin/bash
# Let's Encrypt for browser-trump-board.com (run on EC2 after DNS A records propagate)
set -euo pipefail

DOMAIN="browser-trump-board.com"
EMAIL="${1:-mizuso2020@gmail.com}"

echo "Checking DNS for ${DOMAIN}..."
IP=$(dig +short "${DOMAIN}" A | head -1)
if [ -z "${IP}" ]; then
  echo "ERROR: No A record for ${DOMAIN}. Set Muumuu DNS first, then retry."
  exit 1
fi
echo "DNS A record: ${DOMAIN} -> ${IP}"

if ! command -v certbot &>/dev/null; then
  sudo dnf install -y certbot python3-certbot-nginx
fi

sudo certbot --nginx \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  -m "${EMAIL}" \
  --redirect

sudo nginx -t
sudo systemctl reload nginx

echo "OK: https://${DOMAIN}/games/"
