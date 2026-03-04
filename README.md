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
* `JWT_SECRET` — Secret for JWT tokens
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

## Limitations

* Human players only. No computer players are available.
* No dictionary. Any word can be entered.
* Unlicensed. "Scrabble" is a registered trademark by Hasbro and Spear,
  and the word is used in this program without permission.

Enjoy,
Hans (hans.huebner@gmail.com)
