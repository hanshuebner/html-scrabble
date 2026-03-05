# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Multiplayer Scrabble game (html-scrabble) — pnpm monorepo with three packages: `shared`, `client`, `server`.

## Commands

```bash
# Install dependencies
pnpm install

# Development (run both in separate terminals)
pnpm dev              # Client Vite dev server (port 5173, proxies API to :3000)
pnpm dev:server       # Server with tsx watch (port 3000)

# Build
pnpm -r build         # Build all packages (shared must build first)

# Tests
pnpm test             # Shared package tests (vitest)
pnpm test:all         # All packages
pnpm --filter @scrabble/shared test -- --run path/to/test  # Single test file
pnpm --filter @scrabble/server test                        # Server tests only

# Database (PostgreSQL required)
pnpm --filter @scrabble/server db:generate   # Generate Drizzle migrations
pnpm --filter @scrabble/server db:migrate    # Run migrations
```

## Architecture

### packages/shared (`@scrabble/shared`)
Core game logic with no runtime dependencies. Contains board representation (15x15 grid with multiplier squares), tile/rack/bag management, move validation and scoring (`move-calculator.ts`), letter distributions for 9 languages, and TypeScript type definitions (`types.ts`).

### packages/client (`@scrabble/client`)
React 19 + Vite frontend. Uses Zustand for state, Socket.IO for real-time updates, @dnd-kit for drag-and-drop tile placement, Tailwind CSS v4, React Router v7. Key hook: `useGameState.ts` manages real-time game state via Socket.IO.

### packages/server (`@scrabble/server`)
Express 5 + Socket.IO backend. PostgreSQL via Drizzle ORM. JWT auth with magic links (jose + nodemailer). Game state (board, letter bag) stored as JSONB. Key modules: `auth/`, `game/`, `db/`, `email/`, `stats/`.

### Game Flow
Players create/join games in the lobby. Tiles are placed on the board client-side, then submitted to the server which validates via `calculateMove()` and broadcasts updates over Socket.IO. No server-side dictionary enforcement — challenges use a penalty system.

## Tech Stack

- **Client:** React 19, Vite 6, Zustand 5, Tailwind CSS 4, Socket.IO client, @dnd-kit, TypeScript 5.7
- **Server:** Express 5, Socket.IO 4.8, Drizzle ORM 0.38, PostgreSQL, jose (JWT), nodemailer, tsx
- **Testing:** Vitest 3
- **Runtime:** Node.js ≥20

## Environment Variables (Server)

`DATABASE_URL` (default: `postgres://localhost:5432/scrabble`), `PORT` (default: 3000), `JWT_SECRET`, `BASE_URL`, `MAIL_SENDER`, `SMTP_HOST/PORT/SECURE/USER/PASS`.

## Pre-commit Checks

Before committing, always run:

```bash
pnpm format:check                    # Prettier formatting check
pnpm prettier --write 'packages/*/src/**/*.{ts,tsx}'  # Auto-fix formatting
pnpm -r build                        # TypeScript + Vite build
pnpm test                            # Shared package tests
```

## Coding Conventions

- **Arrow functions only:** Use arrow function syntax (`const fn = () => { ... }`) for all standalone functions. Do not use `function` declarations.
