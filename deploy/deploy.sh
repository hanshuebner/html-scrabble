set -euo pipefail

cd /opt/scrabble
git pull
pnpm install --frozen-lockfile
pnpm -r build

# Close inherited file descriptors so daemon doesn't hold SSH session open
sudo service scrabble restart > /dev/null 2>&1

echo "Waiting for service to start..."
sleep 5

echo "Health check..."
if curl -sf -o /dev/null http://localhost:3000/; then
  echo "Deploy complete."
else
  echo "Health check failed!" >&2
  sudo service scrabble status || true
  tail -20 /var/log/scrabble.log >&2
  exit 1
fi
