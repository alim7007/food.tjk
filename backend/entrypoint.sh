#!/bin/sh
echo "Ensuring seed images are in uploads volume..."
cp -n /app/uploads-seed/* /app/uploads/ 2>/dev/null || true
exec /app/api
