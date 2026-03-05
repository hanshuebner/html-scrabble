set -euo pipefail

cd /opt/scrabble
pnpm install --frozen-lockfile

sudo service scrabble restart

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
