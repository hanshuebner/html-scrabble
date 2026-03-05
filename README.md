# Online Multiplayer Scrabble

## History

This repository contains the code for a multiplayer Scrabble game. I
wrote it because my wife and I got increasingly frustrated by the
sluggish Web 1.0 interface that http://thepixiepit.co.uk/ provides.

I stumbled over http://code.google.com/p/html-scrabble/ one day, which
implemented the interactive parts of a Scrabble board in a very nice
manner. The implementation was lacking the game logic and server parts,
so I forked the project and added the missing pieces.

The game has since been rewritten as a modern TypeScript monorepo with
React, Express, and PostgreSQL, but the spirit of the original remains.

There is a fork of the original game which has reorganized source code,
more languages, automatic players, better touch device support and an
active maintainer. Have a look at
https://github.com/cdot/CrosswordGame before you consider changing this
version.

## Features

* Two to four players
* Czech, English, Estonian, French, German, Hungarian, Slovenian, Dutch
  and Turkish letter sets
* Real-time multiplayer via WebSockets
* Scalable, responsive UI (desktop and mobile)
* Desktop notification support
* Sound effects
* Tile placement by drag & drop or keyboard entry
* Chat
* Standard Scrabble rules including "Challenge" with simple penalty
* No dictionary enforced
* Player statistics
* Magic link authentication (no passwords)

## Tech Stack

* **Client:** React 19, Vite, Zustand, Tailwind CSS 4, Socket.IO, @dnd-kit
* **Server:** Express 5, Socket.IO, Drizzle ORM, PostgreSQL, jose (JWT), nodemailer
* **Shared:** Core game logic (board, tiles, scoring, validation)
* **Runtime:** Node.js >= 20, pnpm

## Installing

```bash
pnpm install
```

## Configuration

The server is configured via environment variables:

* `DATABASE_URL` — PostgreSQL connection string (default: `postgres://localhost:5432/scrabble`)
* `PORT` — Server port (default: 3000)
* `BASE_URL` — Public URL of the server
* `MAIL_SENDER` — Sender address for invitation emails
* `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — SMTP configuration

## Running

```bash
# Development (run in separate terminals)
pnpm dev              # Client dev server (port 5173, proxies API to :3000)
pnpm dev:server       # Server with auto-reload (port 3000)

# Production build
pnpm -r build

# Database migrations
pnpm --filter @scrabble/server db:migrate

# Tests
pnpm test             # Shared package tests
pnpm test:all         # All packages
```

## Database Setup (PostgreSQL)

The server requires PostgreSQL. On FreeBSD:

```bash
# Install PostgreSQL
pkg install postgresql16-server

# Enable and start the service
sysrc postgresql_enable=YES
service postgresql initdb
service postgresql start

# Create the database and user
sudo -u postgres createuser scrabble
sudo -u postgres createdb -O scrabble scrabble
```

The Drizzle schema migrations are run as part of the deployment steps below.

## Production Deployment (FreeBSD)

### Create the service user

```bash
sudo pw useradd scrabble -d /opt/scrabble -s /usr/sbin/nologin -c "Scrabble service"
```

### Set up the application directory

Clone the repository and build:

```bash
sudo mkdir -p /opt/scrabble
sudo chown -R scrabble:scrabble /opt/scrabble
git clone https://github.com/hanshuebner/html-scrabble.git /opt/scrabble
cd /opt/scrabble
sudo -u scrabble pnpm install --frozen-lockfile
sudo -u scrabble pnpm -r build
```

### Install the service

A FreeBSD rc.d service script is provided in `deploy/scrabble.rc`.

```bash
sudo cp deploy/scrabble.rc /usr/local/etc/rc.d/scrabble
sudo touch /var/log/scrabble.log
sudo chown scrabble:scrabble /var/log/scrabble.log
sudo chmod +x /usr/local/etc/rc.d/scrabble
sudo sysrc scrabble_enable=YES
```

### Configure environment

Create `/opt/scrabble/.env` with the service configuration:

```bash
# /opt/scrabble/.env
DATABASE_URL=postgres://scrabble@localhost:5432/scrabble
PORT=3000
BASE_URL=https://your-domain.com/
MAIL_SENDER=scrabble@your-domain.com
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### Initial start

Run database migrations and start the service:

```bash
cd /opt/scrabble
sudo -u scrabble pnpm --filter @scrabble/server db:migrate
sudo service scrabble start
```

### Subsequent deploys

After pulling new code, run `deploy/deploy.sh` which installs dependencies
and restarts the service.

### CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`)
that runs on every push and pull request to `master`:

1. **Test job** — installs dependencies, builds all packages, runs lint,
   format check, database migrations, and tests against a PostgreSQL service
   container.
2. **Deploy job** — on pushes to `master` only, builds the project, rsyncs
   the built artifacts to the production server, and runs `deploy/deploy.sh`
   via SSH.

To enable automated deployment, configure these GitHub repository secrets:

* `SSH_PRIVATE_KEY` — private key for connecting to the server (see below)
* `DEPLOY_HOST` — hostname or IP of the production server
* `DEPLOY_USER` — `scrabble`

#### Setting up the deploy SSH key

Generate a dedicated key pair on your local machine:

```bash
ssh-keygen -t ed25519 -f scrabble-deploy -C "github-actions-deploy" -N ""
```

On the FreeBSD server, add the public key to the `scrabble` user's
authorized keys:

```bash
mkdir -p /opt/scrabble/.ssh
cat scrabble-deploy.pub >> /opt/scrabble/.ssh/authorized_keys
chmod 700 /opt/scrabble/.ssh
chmod 600 /opt/scrabble/.ssh/authorized_keys
chown -R scrabble:scrabble /opt/scrabble/.ssh
```

In GitHub, go to the repository **Settings > Secrets and variables > Actions**
and add the following repository secrets:

* `SSH_PRIVATE_KEY` — paste the contents of `scrabble-deploy` (the private
  key file)
* `DEPLOY_HOST` — the server hostname or IP
* `DEPLOY_USER` — `scrabble`

After adding the secrets, delete the local key files:

```bash
rm scrabble-deploy scrabble-deploy.pub
```

#### Sudoers for service restart

The deploy script uses `sudo service scrabble restart`, so the `scrabble`
user needs passwordless sudo for that command. Add this to
`/usr/local/etc/sudoers` (via `visudo`):

```
scrabble ALL=(root) NOPASSWD: /usr/sbin/service scrabble *
```

## Migrating from the Old File-Based Database

The original server stored game data in a `data.db` file using the
[dirty](https://github.com/felixge/node-dirty) append-only database with
[icebox](https://github.com/kriszyp/icebox) serialization. A migration script
converts this data for import into the new PostgreSQL database.

### Step 1: Export old data to JSON

```bash
cd /opt/scrabble
pnpm --filter @scrabble/server exec tsx scripts/migrate-from-dirty.ts /path/to/data.db
```

This reads the dirty database, deduplicates entries (keeping the last write
for each game key), thaws icebox-serialized objects, and writes a
`data-migrated.json` file. The script prints a summary of each game found.

### Step 2: Import into PostgreSQL

Make sure the database is set up and migrations have been run (see above),
then start the server and import:

```bash
service scrabble start

curl -X POST http://localhost:3000/api/games/import \
  -H "Content-Type: application/json" \
  -d @/path/to/data-migrated.json
```

The endpoint returns a JSON object with the count of imported games and any
errors:

```json
{ "imported": 42, "errors": [] }
```

All game state is preserved: board positions, player racks, scores, turn
history, and end-game results. The `previousMove` field (used for challenges)
is not migrated as its old serialization format is incompatible.

## Limitations

* Human players only. No computer players are available.
* No dictionary. Any word can be entered.
* Unlicensed. "Scrabble" is a registered trademark by Hasbro and Spear,
  and the word is used in this program without permission.

Enjoy,
Hans (hans.huebner@gmail.com)
