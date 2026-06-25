#!/bin/bash
set -euo pipefail
# SuperSender Pro - SSL certificate setup via Let's Encrypt certbot
DOMAIN="" EMAIL=""
if [ -z "" ]||[ -z "" ];then echo "Usage: bash scripts/ssl-setup.sh domain email";exit 1;fi
echo "Setting up SSL for "
if ! command -v certbot >/dev/null 2>&1;then
  if command -v apt-get >/dev/null 2>&1;then sudo apt-get update&&sudo apt-get install -y certbot python3-certbot-nginx;
  else echo "Install certbot manually for your OS.";exit 1;fi
fi
sudo certbot --nginx -d "" --non-interactive --agree-tos -m "" --redirect
sudo certbot renew --dry-run
echo "SSL ready for "
