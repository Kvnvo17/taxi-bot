import logging
import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from datetime import datetime, timedelta
import json
import re

from config import BOT_TOKEN, ADMIN_IDS, WEBAPP_URL
from database import AsyncSessionLocal, User, TaxiAd, ParcelAd, Order, Rating, Complaint, Admin, Setting, MandatoryChannel, Advertisement
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# ---------- FSM HOLATLAR ----------
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

# ---------- YORDAMCHI FUNKTSIYALAR ----------
async def get_user(telegram_id):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one_or_none()

async def create_or_update_user(telegram_id, first_name, **kwargs):
    async with AsyncSessionLocal() as session:
        user = await get_user(telegram_id)
        if not user:
            user = User(telegram_id=telegram_id, first_name=first_name)
            session.add(user)
        for key, val in kwargs.items():
            setattr(user, key, val)
        await session.commit()
        return user

async def is_admin(telegram_id):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Admin).where(Admin.user_id == telegram_id))
        return result.scalar_one_or_none() is not None

async def check_mandatory_channels(telegram_id):
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

# ---------- /start ----------
@dp.message(CommandStart())
async def start_command(message: types.Message):
    await create_or_update_user(message.from_user.id, message.from_user.first_name)
    # main menu
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

# ---------- QANDAY ISHLAYDI ----------
@dp.callback_query(F.data == "howto")
async def howto(callback: types.CallbackQuery):
    await callback.answer()
    text = (
        "Bot yordamida siz:\n"
        "🚖 Taksi e’lonlarini joylashtirishingiz yoki topishingiz,\n"
        "📦 Pochta xizmatidan foydalanishingiz,\n"
        "⭐ Haydovchilarni baholashingiz mumkin.\n\n"
        "Barcha funksiyalar Web App orqali ishlaydi. Bot sizga faqat xabarlarni yetkazadi."
    )
    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
    ]))

@dp.callback_query(F.data == "back_to_start")
async def back_to_start(callback: types.CallbackQuery):
    await callback.answer()
    await start_command(callback.message)

# ---------- ADMINGA MUROJAAT ----------
@dp.callback_query(F.data == "contact_admin")
async def contact_admin(callback: types.CallbackQuery):
    await callback.answer()
    # forward to admin
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(admin_id, f"Foydalanuvchi @{callback.from_user.username} (ID: {callback.from_user.id}) admin bilan bog‘lanmoqchi.")
        except:
            pass
    await callback.message.edit_text("✅ Xabaringiz adminga yuborildi. Tez orada javob olasiz.", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
    ]))

# ---------- ULASHISH ----------
@dp.callback_query(F.data == "share")
async def share(callback: types.CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "Do‘stlaringizni botga taklif qiling! 🚀\n\n"
        "Link: https://t.me/taksi_raqami_bot",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔗 Ulashish", switch_inline_query="Taksi Raqami Bot")],
            [InlineKeyboardButton(text="🔙 Orqaga", callback_data="back_to_start")]
        ])
    )

# ---------- ADMIN PANEL (callback) ----------
@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: types.CallbackQuery):
    if not await is_admin(callback.from_user.id):
        await callback.answer("❌ Siz admin emassiz", show_alert=True)
        return
    await callback.answer()
    await callback.message.edit_text(
        "👑 Admin panel",
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

# ---------- WEB APP TEKSHIRISH (obuna) ----------
# Biz Web App yuklanganda bot tekshirish qilmaydi, lekin Web App o‘zida tekshiradi.
# Biroq, agar foydalanuvchi Web App tugmasini bossa, biz oldin obunani tekshirib,
# agar obuna bo‘lmasa, xabar chiqarib, kanallarga obuna bo‘lishni so‘raymiz.
# Buning uchun ushbu handler: 
@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    # Bu yerda web app dan kelgan ma'lumotlarni qabul qilamiz
    # Ammo biz web app ni ochishdan oldin obunani tekshirish uchun biz
    # start da berilgan web_app tugmasini faqat obuna bo‘lgandan keyin ko‘rsatishimiz mumkin.
    # Buning uchun check_mandatory_channels ni ishlatamiz.
    pass

# Biz start da web_app tugmasini ko‘rsatishdan oldin obunani tekshiramiz:
# @dp.message(CommandStart()) da:
# if not await check_mandatory_channels(message.from_user.id):
#     # kanallarni ko‘rsat va obuna bo‘lishni so‘ra
#     channels = await get_mandatory_channels_list()
#     text = "Botdan foydalanish uchun quyidagi kanallarga obuna bo‘ling:\n"
#     for ch in channels:
#         text += f"🔹 @{ch.username}\n"
#     text += "\nObuna bo‘lgach, /start ni qayta bosing."
#     await message.answer(text)
#     return
# Shunday qilib, obuna bo‘lmaguncha Web App tugmasi ko‘rinmaydi.

# Yuqoridagi kodni start ga qo‘shamiz. 

# ---------- BOSHQA HANDLERLAR ----------
# Men taksisman, Men yo‘lovchiman, Pochta olaman, Pochta yuboraman - bular Web App orqali amalga oshiriladi.
# Shuning uchun bot faqat buyurtma tasdiqlash, telefon raqami so‘rash va reyting so‘rash uchun ishlatiladi.
# Shuningdek, admin panel reklama va kanal boshqaruvi bot orqali.

# ---------- REKLAMA YUBORISH (admin) ----------
@dp.callback_query(F.data == "admin_ad")
async def admin_ad(callback: types.CallbackQuery, state: FSMContext):
    if not await is_admin(callback.from_user.id):
        await callback.answer("❌", show_alert=True)
        return
    await callback.answer()
    await callback.message.edit_text(
        "📣 Reklama yuborish\n\n"
        "Reklama matnini kiriting (agar rasm/video bo‘lsa, avval uni yuboring):",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Bekor qilish", callback_data="admin_panel")]
        ])
    )
    await state.set_state(AdminState.ad_text)

@dp.message(AdminState.ad_text, F.text)
async def ad_text(message: types.Message, state: FSMContext):
    await state.update_data(text=message.text)
    await message.answer("Endi rasm/video yuboring (ixtiyoriy, agar bo‘lmasa 'O‘tkazib yuborish' deb yozing):")
    await state.set_state(AdminState.ad_media)

@dp.message(AdminState.ad_media)
async def ad_media(message: types.Message, state: FSMContext):
    data = await state.get_data()
    media_file_id = None
    media_type = None
    if message.photo:
        media_file_id = message.photo[-1].file_id
        media_type = "photo"
    elif message.video:
        media_file_id = message.video.file_id
        media_type = "video"
    elif message.text and message.text.lower() == "o‘tkazib yuborish":
        pass
    else:
        await message.answer("Iltimos, rasm/video yuboring yoki 'O‘tkazib yuborish' deb yozing.")
        return
    await state.update_data(media_file_id=media_file_id, media_type=media_type)
    await message.answer("Tugma matni va URL ni kiriting (masalan: 'Batafsil|https://...'), yoki 'yo‘q' deb yozing:")
    await state.set_state(AdminState.ad_button)

@dp.message(AdminState.ad_button)
async def ad_button(message: types.Message, state: FSMContext):
    if message.text.lower() != "yo‘q":
        try:
            text, url = message.text.split("|")
        except:
            await message.answer("Noto‘g‘ri format. 'Batafsil|https://...' shaklida yozing.")
            return
        await state.update_data(button_text=text, button_url=url)
    else:
        await state.update_data(button_text=None, button_url=None)
    await message.answer("Kimga yuboramiz? (all, drivers, passengers):")
    await state.set_state(AdminState.ad_segment)

@dp.message(AdminState.ad_segment)
async def ad_segment(message: types.Message, state: FSMContext):
    segment = message.text.lower()
    if segment not in ["all", "drivers", "passengers"]:
        await message.answer("Faqat: all, drivers, passengers")
        return
    data = await state.get_data()
    # Saqlash
    async with AsyncSessionLocal() as session:
        ad = Advertisement(
            text=data["text"],
            media_type=data.get("media_type"),
            media_file_id=data.get("media_file_id"),
            button_text=data.get("button_text"),
            button_url=data.get("button_url"),
            target_segment=segment
        )
        session.add(ad)
        await session.commit()
    # Yuborish
    await broadcast_ad(data["text"], data.get("media_type"), data.get("media_file_id"),
                       data.get("button_text"), data.get("button_url"), segment)
    await message.answer("✅ Reklama yuborildi va saqlandi!", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Admin panel", callback_data="admin_panel")]
    ]))
    await state.clear()

async def broadcast_ad(text, media_type, media_file_id, button_text, button_url, segment):
    async with AsyncSessionLocal() as session:
        query = select(User)
        if segment == "drivers":
            # taksi e’loni borlar
            subquery = select(TaxiAd.user_id).distinct()
            query = query.where(User.id.in_(subquery))
        elif segment == "passengers":
            # buyurtma berganlar
            subquery = select(Order.passenger_id).distinct()
            query = query.where(User.id.in_(subquery))
        users = await session.execute(query)
        users = users.scalars().all()
        for user in users:
            try:
                if media_type == "photo":
                    await bot.send_photo(user.telegram_id, media_file_id, caption=text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text=button_text, url=button_url)] if button_text else []
                    ]))
                elif media_type == "video":
                    await bot.send_video(user.telegram_id, media_file_id, caption=text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text=button_text, url=button_url)] if button_text else []
                    ]))
                else:
                    await bot.send_message(user.telegram_id, text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text=button_text, url=button_url)] if button_text else []
                    ]))
            except:
                pass

# ---------- MAJBURIY OBUNA (kanal qo‘shish/o‘chirish) ----------
@dp.callback_query(F.data == "admin_channels")
async def admin_channels(callback: types.CallbackQuery):
    if not await is_admin(callback.from_user.id):
        await callback.answer("❌", show_alert=True)
        return
    await callback.answer()
    channels = await get_mandatory_channels_list()
    text = "🔗 Majburiy kanallar:\n\n"
    for ch in channels:
        text += f"@{ch.username}\n"
    text += "\nQo‘shish uchun: /add_channel @username\nO‘chirish uchun: /remove_channel @username"
    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Orqaga", callback_data="admin_panel")]
    ]))

@dp.message(Command("add_channel"))
async def add_channel(message: types.Message):
    if not await is_admin(message.from_user.id):
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
async def remove_channel(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Format: /remove_channel @username")
        return
    username = args[1].lstrip("@")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(MandatoryChannel).where(MandatoryChannel.username == username))
        ch = result.scalar_one_or_none()
        if ch:
            await session.delete(ch)
            await session.commit()
            await message.answer(f"✅ @{username} o‘chirildi.")
        else:
            await message.answer("❌ Bunday kanal mavjud emas.")

# ---------- REYTING SO‘ROVI (buyurtma yakunlangandan 5 soat keyin) ----------
# Bu yerda biz buyurtma statusi completed bo‘lganda, 5 soatdan keyin reyting so‘rovini yuborish uchun
# scheduled task yoki background worker kerak. Oddiy usul: Web App da buyurtmani yakunlashda
# bot orqali xabar yuborish va 5 soatdan keyin eslatma yuborish uchun celery yoki asyncio.create_task.
# Biz soddaroq qilib, har bir buyurtma uchun alohida task yaratamiz.
# Buni main.py da startup da ishga tushiramiz.

async def schedule_rating(order_id, driver_id, passenger_id):
    await asyncio.sleep(5 * 3600)  # 5 soat
    # check if order still completed and no rating yet
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if order and order.status == "completed":
            # check if rating already exists
            existing = await session.execute(select(Rating).where(Rating.order_id == order_id))
            if not existing.scalar_one_or_none():
                # send rating request to passenger
                passenger = await session.get(User, passenger_id)
                if passenger:
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text="⭐ 1", callback_data=f"rate_{order_id}_1"),
                         InlineKeyboardButton(text="⭐ 2", callback_data=f"rate_{order_id}_2"),
                         InlineKeyboardButton(text="⭐ 3", callback_data=f"rate_{order_id}_3"),
                         InlineKeyboardButton(text="⭐ 4", callback_data=f"rate_{order_id}_4"),
                         InlineKeyboardButton(text="⭐ 5", callback_data=f"rate_{order_id}_5")]
                    ])
                    await bot.send_message(passenger.telegram_id, "⭐ Haydovchini baholang:", reply_markup=keyboard)

@dp.callback_query(F.data.startswith("rate_"))
async def rate_driver(callback: types.CallbackQuery):
    _, order_id, score = callback.data.split("_")
    order_id = int(order_id)
    score = int(score)
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if not order:
            await callback.answer("❌ Buyurtma topilmadi", show_alert=True)
            return
        # check if already rated
        existing = await session.execute(select(Rating).where(Rating.order_id == order_id))
        if existing.scalar_one_or_none():
            await callback.answer("❌ Siz allaqachon baholagansiz", show_alert=True)
            return
        rating = Rating(order_id=order_id, rater_id=order.passenger_id, rated_id=order.driver_id, score=score)
        session.add(rating)
        # update driver rating
        driver = await session.get(User, order.driver_id)
        if driver:
            driver.rating = (driver.rating * driver.rating_count + score) / (driver.rating_count + 1)
            driver.rating_count += 1
        await session.commit()
    await callback.answer("✅ Baholadingiz!", show_alert=True)

# ---------- BOSHQA HANDLERLAR ----------
# buyurtma berish, pochta yuborish va h.k. Web App orqali amalga oshiriladi,
# lekin telefon raqami so‘rash va taksist raqamini yuborish bot orqali.
# Buning uchun Web App dan /api/order/create ga POST so‘rov yuboriladi,
# va bot driver va passenger ga xabar yuboradi.

# ... qolgan kodlar ...

# ---------- BOTNI ISHGA TUSHIRISH ----------
async def main():
    await init_db()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
