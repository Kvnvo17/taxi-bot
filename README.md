# Taksi Raqami Bot

Telegram bot + Web App for taxi and parcel services.

## Features
- 🚖 Taxi ads and search
- 📦 Parcel delivery
- ⭐ Rating system
- 👑 Admin panel (broadcast, mandatory channels)
- 🌙 Light/Dark theme
- 🌍 Multi-language support (uz, uz_cyrl, ru, en)

## Setup
1. Rename `.env.example` to `.env` and fill in variables.
2. Run `docker build -t taksi-bot . && docker run -p 8000:8000 taksi-bot` or use Render.

## Deployment on Render
- Use the `render.yaml` or manual setup.
- Set environment variables in Render dashboard.

## API Endpoints
- `/health` – health check
- `/webapp` – Web App UI
- `/api/*` – REST API for the Web App

## Bot commands
- `/start` – main menu
- `/add_channel @username` – admin only
- `/remove_channel @username` – admin only

## Database
SQLite `taxi.db` auto-created on first run.
