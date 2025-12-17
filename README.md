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
