# LotusOS

The cognitive operating system powering [Healer-AI](https://healer.ai) — an emotionally intelligent AI companion.

## Architecture

```
LotusOS/
├── packages/
│   ├── backend/     # TypeScript + Bun HTTP server (port 3001)
│   └── frontend/    # React + TanStack Start + Tailwind CSS (port 5173)
```

## Quick Start

```bash
# Clone
git clone https://github.com/MrDecryptDecipher/LotusOS.git
cd LotusOS

# Install
bun install

# Set up the database (Neon PostgreSQL)
export DATABASE_URL="postgresql://..."

# Run both packages in dev mode
bun run dev

# Or individually
cd packages/backend && bun run dev   # → http://localhost:3001
cd packages/frontend && bun run dev  # → http://localhost:5173
```

## API Endpoints

| Method | Path               | Description                |
|--------|--------------------|----------------------------|
| GET    | `/api/health`      | Server health check        |
| GET    | `/api/db-health`   | Database connectivity ping |

## Scripts

| Command            | Description                              |
|--------------------|------------------------------------------|
| `bun run dev`      | Start both packages in dev mode          |
| `bun run build`    | Build both packages                      |
| `bun run typecheck`| Run TypeScript type checking             |
| `bun run lint`     | Run linter (to be configured)            |

## Tech Stack

- **Runtime:** Bun
- **Backend:** TypeScript, Bun.serve, postgres.js, Drizzle ORM
- **Frontend:** React 19, TanStack Start/Router, Tailwind CSS 4, Vite
- **Database:** PostgreSQL (Neon serverless)
