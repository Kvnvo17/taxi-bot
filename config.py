importimport os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = list(map(int, os.getenv("ADMIN_IDS", "").split(","))) if os.getenv("ADMIN_IDS") else []
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
WEBAPP_URL = os.getenv("WEBAPP_URL")

# ✅ TO'G'RI - 3 ta slash!
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///taxi.db")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret") os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = list(map(int, os.getenv("ADMIN_IDS", "").split(","))) if os.getenv("ADMIN_IDS") else []
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
WEBAPP_URL = os.getenv("WEBAPP_URL")  # masalan, https://yourdomain.com/webapp
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///taxi.db")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
