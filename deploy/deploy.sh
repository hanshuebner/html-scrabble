#!/bin/bash
set -euo pipefail

cd /opt/scrabble

echo "Installing production dependencies..."
pnpm install --prod --frozen-lockfile

echo "Restarting scrabble service..."
sudo service scrabble restart

echo "Checking service status..."
sudo service scrabble status

echo "Deploy complete."
