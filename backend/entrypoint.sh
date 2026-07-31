#!/bin/sh
if [ ! -f /app/uploads/shawarma_main.png ]; then
    echo "Copying seed images to uploads volume..."
    cp -r /app/uploads-seed/* /app/uploads/
fi
exec /app/api
