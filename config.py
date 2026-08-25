import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = list(map(int, os.getenv("ADMIN_IDS", "").split(","))) if os.getenv("ADMIN_IDS") else []

# ✅ DEFAULT QIYMAT BERING:
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://taxi-bot-5jpm.onrender.com/webapp")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://taxi-bot-5jpm.onrender.com/webhook")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///taxi.db")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
