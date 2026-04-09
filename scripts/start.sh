#!/bin/sh
set -e

echo "=== Step 1: DB push ==="
npx prisma db push

echo "=== Step 2: Init DB ==="
node scripts/init-db.js

echo "=== Step 3: Starting app on port ${PORT:-3000} ==="
exec npx next start -p ${PORT:-3000}
