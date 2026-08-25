# ============================================================
# bot.py – Taksi Raqami Telegram Bot
# Versiya: 2.0 (to‘liq funksiyalar)
# ============================================================

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Optional

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton,
    WebAppInfo, Message, CallbackQuery
)
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from config import BOT_TOKEN, ADMIN_IDS, WEBAPP_URL
from database import (
    AsyncSessionLocal, User, TaxiAd, ParcelAd, Order,
    Rating, Complaint, Admin, Setting, MandatoryChannel,
    Advertisement, init_db
)

# -------------------- LOGGING --------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------------------- BOT VA DISPATCHER --------------------
bot = Bot(
    token=BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)
dp = Dispatcher()

# -------------------- FSM HOLATLAR --------------------
class TaxiDriverForm(StatesGroup):
    wait_time = State()
    seats = State()
    from_region = State()
    from_district = State()
    from_neighborhood = State()
    to_region = State()
    to_district = State()
    price = State()
    negotiable = State()
    takes_parcel = State()
    parcel_size = State()
    phone = State()

class PassengerForm(StatesGroup):
    people = State()
    from_region = State()
    from_district = State()
    to_region = State()
    to_district = State()

class ParcelSenderForm(StatesGroup):
    from_region = State()
    from_district = State()
    from_neighborhood = State()
    to_region = State()
    to_district = State()
    size = State()
    phone = State()

class OrderForm(StatesGroup):
    phone = State()

class AdminState(StatesGroup):
    add_channel = State()
    remove_channel = State()
    send_ad = State()
    ad_text = State()
    ad_media = State()
    ad_button = State()
    ad_segment = State()

# -------------------- YORDAMCHI FUNKSIYALAR --------------------
async def get_user(telegram_id: int) -> Optional[User]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

async def create_or_update_user(telegram_id: int, first_name: str, **kwargs) -> User:
    async with AsyncSessionLocal() as session:
        user = await get_user(telegram_id)
        if not user:
            user = User(telegram_id=telegram_id, first_name=first_name)
            session.add(user)
        for key, val in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, val)
        await session.commit()
        return user

async def is_admin(telegram_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Admin).where(Admin.user_id == telegram_id)
        )
        return result.scalar_one_or_none() is not None

async def check_mandatory_channels(telegram_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        channels = await session.execute(select(MandatoryChannel))
        channels = channels.scalars().all()
        for ch in channels:
            try:
                member = await bot.get_chat_member(f"@{ch.username}", telegram_id)
                if member.status in ["left", "kicked"]:
                    return False
            except:
                return False
        return True

async def get_mandatory_channels_list():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(MandatoryChannel))
        return result.scalars().all()

async def schedule_rating(order_id: int, driver_id: int, passenger_id: int):
    await asyncio.sleep(5 * 3600)  # 5 soat
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if order and order.status == "completed":
            existing = await session.execute(
                select(Rating).where(Rating.order_id == order_id)
            )
            if not existing.scalar_one_or_none():
                passenger = await session.get(User, passenger_id)
                if passenger:
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text="⭐ 1", callback_data=f"rate_{order_id}_1"),
                         InlineKeyboardButton(text="⭐ 2", callback_data=f"rate_{order_id}_2"),
                         InlineKeyboardButton(text="⭐ 3", callback_data=f"rate_{order_id}_3"),
                         InlineKeyboardButton(text="⭐ 4", callback_data=f"rate_{order_id}_4"),
                         InlineKeyboardButton(text="⭐ 5", callback_data=f"rate_{order_id}_5")]
                    ])
                    await bot.send_message(
                        passenger.telegram_id,
                        "⭐ Haydovchini baholang:",
                        reply_markup=keyboard
                    )

# -------------------- /START --------------------
@dp.message(CommandStart())
async def start_command(message: Message):
    await create_or_update_user(message.from_user.id, message.from_user.first_name)

    # Majburiy obuna tekshiruvi
    if not await check_mandatory_channels(message.from_user.id):
        channels = await get_mandatory_channels_list()
        text = "🔔 Botdan foydalanish uchun quyidagi kanallarga obuna bo‘ling:\n"
        for ch in channels:
            text += f"🔹 @{ch.username}\n"
        text += "\nObuna bo‘lgach, /start ni qayta bosing."
        await message.answer(text)
        return

    buttons = [
        [InlineKeyboardButton(text="🌐 Web App’ni ochish", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(text="📖 Qanday ishlaydi?", callback_data="howto")],
        [InlineKeyboardButton(text="💬 Adminga murojaat", callback_data="contact_admin")],
        [InlineKeyboardButton(text="👥 Do‘stlarga ulashish", callback_data="share")],
    ]
    if await is_admin(message.from_user.id):
        buttons.append([InlineKeyboardButton(text="👑 Admin panel", callback_data="admin_panel")])

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
    await message.answer(
        "Assalomu alaykum! 👋\n\n"
        "Taksi Raqami Bot’ga xush kelibsiz.\n"
        "Taksi va pochta xizmatini tez toping.",
        reply_markup=keyboard
    )

# -------------------- QANDAY ISHLAYDI --------------------
@dp.callback_query(F.data == "howto")
async def howto(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "📖 <b>Qanday ishlaydi?</b>\n\n"
        "Bot yordamida siz:\n"
        "🚖 Taksi e’lonlarini joylashtirishingiz yoki topishingiz,\n"
        "📦 Pochta xizmatidan foydalanishingiz,\n"
        "⭐ Haydovchilarni baholashingiz mumkin.\n\n"
        "Barcha funksiyalar Web App orqali ishlaydi.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
        ])
    )

@dp.callback_query(F.data == "back_to_start")
async def back_to_start(callback: CallbackQuery):
    await callback.answer()
    await start_command(callback.message)

# -------------------- ADMINGA MUROJAAT --------------------
@dp.callback_query(F.data == "contact_admin")
async def contact_admin(callback: CallbackQuery):
    await callback.answer()
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                f"📩 Foydalanuvchi @{callback.from_user.username} (ID: {callback.from_user.id}) admin bilan bog‘lanmoqchi."
            )
        except:
            pass
    await callback.message.edit_text(
        "✅ Xabaringiz adminga yuborildi.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
        ])
    )

# -------------------- ULASHISH --------------------
@dp.callback_query(F.data == "share")
async def share(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "👥 Do‘stlaringizni botga taklif qiling!\n\n"
        "🔗 https://t.me/" + (await bot.get_me()).username,
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔗 Ulashish", switch_inline_query="Taksi Raqami Bot")],
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
        ])
    )

# -------------------- ADMIN PANEL (bot orqali) --------------------
@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: CallbackQuery):
    if not await is_admin(callback.from_user.id):
        await callback.answer("❌ Siz admin emassiz", show_alert=True)
        return
    await callback.answer()
    await callback.message.edit_text(
        "👑 <b>Admin panel</b>",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📊 Dashboard", callback_data="admin_dashboard")],
            [InlineKeyboardButton(text="👤 Foydalanuvchilar", callback_data="admin_users")],
            [InlineKeyboardButton(text="🚖 Taksi e’lonlari", callback_data="admin_taxi_ads")],
            [InlineKeyboardButton(text="📦 Pochta e’lonlari", callback_data="admin_parcel_ads")],
            [InlineKeyboardButton(text="📋 Buyurtmalar", callback_data="admin_orders")],
            [InlineKeyboardButton(text="⭐ Reytinglar", callback_data="admin_ratings")],
            [InlineKeyboardButton(text="📢 Shikoyatlar", callback_data="admin_complaints")],
            [InlineKeyboardButton(text="📍 Manzillar", callback_data="admin_locations")],
            [InlineKeyboardButton(text="📣 Reklama", callback_data="admin_ad")],
            [InlineKeyboardButton(text="🔗 Majburiy obuna", callback_data="admin_channels")],
            [InlineKeyboardButton(text="⚙️ Sozlamalar", callback_data="admin_settings")],
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
        ])
    )

# -------------------- ADMIN KOMANDALARI (qisqa) --------------------
# (To‘liq admin funksiyalarini main.py dagi API lar orqali ham bajarish mumkin)
# Quyida faqat /add_admin va /remove_admin komandalarini qo‘shamiz

@dp.message(Command("add_admin"))
async def add_admin_command(message: Message):
    # Faqat asosiy admin (ADMIN_IDS) qo‘shishi mumkin
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ Ruxsat yo‘q")
        return
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Format: /add_admin telegram_id")
        return
    try:
        new_admin_id = int(args[1])
    except:
        await message.answer("❌ ID raqam bo‘lishi kerak")
        return
    async with AsyncSessionLocal() as session:
        # User mavjudligini tekshirish
        user = await session.execute(
            select(User).where(User.telegram_id == new_admin_id)
        )
        user = user.scalar_one_or_none()
        if not user:
            await message.answer("❌ Bunday foydalanuvchi topilmadi (avval /start bosing)")
            return
        # Admin sifatida qo‘shish
        existing = await session.execute(
            select(Admin).where(Admin.user_id == new_admin_id)
        )
        if existing.scalar_one_or_none():
            await message.answer("ℹ️ Bu foydalanuvchi allaqachon admin")
            return
        admin = Admin(user_id=new_admin_id, role="admin")
        session.add(admin)
        await session.commit()
    await message.answer(f"✅ Admin qo‘shildi: {new_admin_id}")

@dp.message(Command("remove_admin"))
async def remove_admin_command(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ Ruxsat yo‘q")
        return
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Format: /remove_admin telegram_id")
        return
    try:
        admin_id = int(args[1])
    except:
        await message.answer("❌ ID raqam bo‘lishi kerak")
        return
    async with AsyncSessionLocal() as session:
        admin = await session.execute(
            select(Admin).where(Admin.user_id == admin_id)
        )
        admin = admin.scalar_one_or_none()
        if not admin:
            await message.answer("❌ Bunday admin topilmadi")
            return
        await session.delete(admin)
        await session.commit()
    await message.answer(f"✅ Admin o‘chirildi: {admin_id}")

# -------------------- REYTING BAHOLASH --------------------
@dp.callback_query(F.data.startswith("rate_"))
async def rate_driver(callback: CallbackQuery):
    _, order_id, score = callback.data.split("_")
    order_id = int(order_id)
    score = int(score)
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if not order:
            await callback.answer("❌ Buyurtma topilmadi", show_alert=True)
            return
        existing = await session.execute(
            select(Rating).where(Rating.order_id == order_id)
        )
        if existing.scalar_one_or_none():
            await callback.answer("❌ Siz allaqachon baholagansiz", show_alert=True)
            return
        rating = Rating(
            order_id=order_id,
            rater_id=order.passenger_id,
            rated_id=order.driver_id,
            score=score
        )
        session.add(rating)
        # Haydovchi reytingini yangilash
        driver = await session.get(User, order.driver_id)
        if driver:
            driver.rating = (driver.rating * driver.rating_count + score) / (driver.rating_count + 1)
            driver.rating_count += 1
        await session.commit()
    await callback.answer("✅ Baholadingiz!", show_alert=True)

# -------------------- MAJBURIY OBUNA KANALLARI (admin) --------------------
@dp.callback_query(F.data == "admin_channels")
async def admin_channels(callback: CallbackQuery):
    if not await is_admin(callback.from_user.id):
        await callback.answer("❌", show_alert=True)
        return
    await callback.answer()
    channels = await get_mandatory_channels_list()
    text = "🔗 <b>Majburiy kanallar</b>\n\n"
    for ch in channels:
        text += f"🔹 @{ch.username}\n"
    text += "\nQo‘shish: /add_channel @username\nO‘chirish: /remove_channel @username"
    await callback.message.edit_text(
        text,
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="admin_panel")]
        ])
    )

@dp.message(Command("add_channel"))
async def add_channel(message: Message):
    if not await is_admin(message.from_user.id):
        await message.answer("❌ Ruxsat yo‘q")
        return
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Format: /add_channel @username")
        return
    username = args[1].lstrip("@")
    async with AsyncSessionLocal() as session:
        ch = MandatoryChannel(username=username)
        session.add(ch)
        await session.commit()
    await message.answer(f"✅ @{username} qo‘shildi.")

@dp.message(Command("remove_channel"))
async def remove_channel(message: Message):
    if not await is_admin(message.from_user.id):
        await message.answer("❌ Ruxsat yo‘q")
        return
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Format: /remove_channel @username")
        return
    username = args[1].lstrip("@")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MandatoryChannel).where(MandatoryChannel.username == username)
        )
        ch = result.scalar_one_or_none()
        if ch:
            await session.delete(ch)
            await session.commit()
            await message.answer(f"✅ @{username} o‘chirildi.")
        else:
            await message.answer("❌ Bunday kanal mavjud emas.")

# -------------------- WEB APP DAN KELGAN SOHIRLAR (ixtiyoriy) --------------------
@dp.message(F.web_app_data)
async def handle_webapp_data(message: Message):
    # Web App dan kelgan ma'lumotlarni qabul qilish
    data = message.web_app_data.data
    try:
        json_data = json.loads(data)
        await message.answer(f"📩 Ma'lumot qabul qilindi: {json_data}")
    except:
        await message.answer("❌ Noto‘g‘ri format")

# -------------------- BOTNI ISHGA TUSHIRISH --------------------
async def main():
    await init_db()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
