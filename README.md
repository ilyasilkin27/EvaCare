# EvaCare — Telegram pill reminder (MVP)

Minimal Telegram bot that reminds a single user to take pills. Built with Bun, grammy and node-cron. Data stored in local JSON.

Setup

1. Copy `.env.example` to `.env` and set `BOT_TOKEN` and `USER_ID`.

2. Install dependencies (with bun):

```bash
bun install
```

3. Run:

```bash
bun run start
```

Usage

- Use the keyboard: `➕ Добавить таблетку` or `📋 Мои таблетки`.
- All actions use buttons and simple replies (no slash commands required).

Data

Stored in `data.json` with structure matching the spec.

Docker

Build the image (from repo root):

```bash
docker build -t evacare-bot:latest .
```

Run the container (set `BOT_TOKEN` and `USER_ID` via env or `.env`):

```bash
docker run -d --name evacare \
	--env-file .env \
	evacare-bot:latest
```

To deploy to a Docker-hosting service, push the built image to your registry and configure the service to run the container with the same env vars.
