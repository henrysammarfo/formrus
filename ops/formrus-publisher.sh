#!/usr/bin/env bash
set -euo pipefail

source "$HOME/.config/walrus/publisher.env"
WALRUS_JWT_SECRET="$(printf "%s" "$WALRUS_JWT_SECRET" | tr -d "\r\n")"

exec "$HOME/.local/bin/walrus" \
  --config "$HOME/.config/walrus/publisher/client_config.yaml" \
  publisher \
  --bind-address "127.0.0.1:31416" \
  --sub-wallets-dir "$HOME/.config/walrus/publisher-wallets" \
  --n-clients 1 \
  --max-body-size 51200 \
  --jwt-decode-secret "$WALRUS_JWT_SECRET" \
  --jwt-algorithm HS256 \
  --jwt-expiring-sec 60 \
  --jwt-verify-upload
