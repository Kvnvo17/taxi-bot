# ============================================================
# main.py – FastAPI Backend (TO‘LIQ VERSIYA)
# ============================================================

import os
import json
import shutil
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from database import (
    AsyncSessionLocal, User, TaxiAd, ParcelAd, Order,
    Rating, Complaint, Admin, Setting, MandatoryChannel,
    init_db
)
from config import ADMIN_IDS
from bot import bot, schedule_rating

app = FastAPI()

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== STATIC =====
UPLOAD_DIR = "static/banners"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ===== MODELS =====
class TaxiAdCreate(BaseModel):
    wait_time: int
    seats: int
    from_location: dict
    to_location: dict
    price: float
    negotiable: bool
    takes_parcel: bool
    parcel_size: Optional[str]
    phone: str

class OrderCreate(BaseModel):
    taxi_ad_id: int
    passenger_telegram_id: int
    type: str

# ===== ADMIN TEKSHIRUV =====
async def is_admin(telegram_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Admin).where(Admin.user_id == telegram_id)
        )
        return result.scalar_one_or_none() is not None

# ===== API ENDPOINTS =====
@app.get("/api/admin/check")
async def admin_check(telegram_id: int):
    return {"is_admin": await is_admin(telegram_id)}

@app.get("/api/admin/dashboard")
async def admin_dashboard(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        users = await session.execute(select(func.count()).select_from(User))
        taxi_ads = await session.execute(
            select(func.count()).select_from(TaxiAd).where(TaxiAd.is_active == True)
        )
        parcel_ads = await session.execute(
            select(func.count()).select_from(ParcelAd).where(ParcelAd.is_active == True)
        )
        orders = await session.execute(select(func.count()).select_from(Order))
        complaints = await session.execute(select(func.count()).select_from(Complaint))
        return {
            "users": users.scalar(),
            "taxi_ads": taxi_ads.scalar(),
            "parcel_ads": parcel_ads.scalar(),
            "orders": orders.scalar(),
            "avg_rating": 4.8,
            "complaints": complaints.scalar()
        }

@app.get("/api/admin/users")
async def admin_users(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        users = await session.execute(select(User))
        return [{"id": u.id, "name": u.first_name, "phone": u.phone, "rating": u.rating, "is_active": True} for u in users.scalars().all()]

@app.get("/api/admin/taxi-ads")
async def admin_taxi_ads(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        ads = await session.execute(select(TaxiAd).order_by(TaxiAd.created_at.desc()))
        result = []
        for ad in ads.scalars().all():
            driver = await session.get(User, ad.user_id)
            result.append({
                "id": ad.id,
                "driver_name": driver.first_name if driver else "Noma'lum",
                "from": ad.from_location,
                "to": ad.to_location,
                "is_active": ad.is_active
            })
        return result

@app.get("/api/admin/parcel-ads")
async def admin_parcel_ads(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        ads = await session.execute(select(ParcelAd).order_by(ParcelAd.created_at.desc()))
        result = []
        for ad in ads.scalars().all():
            user = await session.get(User, ad.user_id)
            result.append({
                "id": ad.id,
                "user_name": user.first_name if user else "Noma'lum",
                "from": ad.from_location,
                "to": ad.to_location,
                "size": ad.size,
                "is_active": ad.is_active
            })
        return result

@app.get("/api/admin/orders")
async def admin_orders(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        orders = await session.execute(
            select(Order).order_by(Order.created_at.desc())
        )
        result = []
        for o in orders.scalars().all():
            passenger = await session.get(User, o.passenger_id) if o.passenger_id else None
            driver = await session.get(User, o.driver_id) if o.driver_id else None
            result.append({
                "id": o.id,
                "passenger_name": passenger.first_name if passenger else "Noma'lum",
                "driver_name": driver.first_name if driver else "Noma'lum",
                "status": o.status,
                "created_at": o.created_at.isoformat()
            })
        return result

@app.get("/api/admin/ratings")
async def admin_ratings(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        ratings = await session.execute(select(Rating))
        data = {}
        for r in ratings.scalars().all():
            driver = await session.get(User, r.rated_id)
            name = driver.first_name if driver else "Noma'lum"
            if name not in data:
                data[name] = {"driver_name": name, "avg_rating": 0, "count": 0, "last_score": 0}
            data[name]["avg_rating"] = (data[name]["avg_rating"] * data[name]["count"] + r.score) / (data[name]["count"] + 1)
            data[name]["count"] += 1
            data[name]["last_score"] = r.score
        return list(data.values())

@app.get("/api/admin/complaints")
async def admin_complaints(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        complaints = await session.execute(
            select(Complaint).order_by(Complaint.created_at.desc())
        )
        result = []
        for c in complaints.scalars().all():
            user = await session.get(User, c.user_id)
            result.append({
                "id": c.id,
                "user_name": user.first_name if user else "Noma'lum",
                "text": c.text,
                "status": "pending"  # status maydoni qo'shilmagan, shuning uchun default
            })
        return result

@app.get("/api/admin/channels")
async def admin_channels(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        channels = await session.execute(select(MandatoryChannel))
        return [{"username": ch.username} for ch in channels.scalars().all()]

@app.post("/api/admin/channels")
async def add_channel(data: dict, telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        ch = MandatoryChannel(username=data["username"])
        session.add(ch)
        await session.commit()
    return {"status": "ok"}

@app.delete("/api/admin/channels/{username}")
async def delete_channel(username: str, telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MandatoryChannel).where(MandatoryChannel.username == username)
        )
        ch = result.scalar_one_or_none()
        if ch:
            await session.delete(ch)
            await session.commit()
    return {"status": "ok"}

@app.post("/api/admin/broadcast")
async def admin_broadcast(data: dict, telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    async with AsyncSessionLocal() as session:
        users = await session.execute(select(User))
        sent = 0
        for user in users.scalars().all():
            try:
                await bot.send_message(user.telegram_id, data["text"])
                sent += 1
            except:
                pass
        return {"sent": sent}

@app.post("/api/admin/settings")
async def admin_settings(data: dict, telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    # Settings saqlash
    return {"status": "ok"}

# ===== BANNER =====
@app.post("/api/admin/banner")
async def upload_banner(
    telegram_id: int = Form(...),
    banner: UploadFile = File(...)
):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    # 3:4 nisbat tekshirish uchun PIL yoki imagesize ishlatilishi kerak
    file_path = f"{UPLOAD_DIR}/banner_{telegram_id}.jpg"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(banner.file, buffer)
    return {"url": f"/static/banners/banner_{telegram_id}.jpg"}

@app.delete("/api/admin/banner")
async def delete_banner(telegram_id: int):
    if not await is_admin(telegram_id):
        raise HTTPException(403, "Admin emas")
    file_path = f"{UPLOAD_DIR}/banner_{telegram_id}.jpg"
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"status": "ok"}

@app.get("/api/banner/{telegram_id}")
async def get_banner(telegram_id: int):
    file_path = f"{UPLOAD_DIR}/banner_{telegram_id}.jpg"
    if os.path.exists(file_path):
        return {"url": f"/static/banners/banner_{telegram_id}.jpg"}
    return {"url": None}

# ===== ASOSIY API =====
@app.get("/api/user/{telegram_id}")
async def get_user(telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        return {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "first_name": user.first_name,
            "phone": user.phone,
            "car_name": user.car_name,
            "rating": user.rating,
            "language": user.language,
            "theme": user.theme
        }

@app.post("/api/user/update")
async def update_user(data: dict):
    async with AsyncSessionLocal() as session:
        user = await session.execute(
            select(User).where(User.telegram_id == data["telegram_id"])
        )
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        for key, val in data.items():
            if key != "telegram_id" and hasattr(user, key):
                setattr(user, key, val)
        await session.commit()
        return {"status": "ok"}

@app.post("/api/taxi/ad")
async def create_taxi_ad(ad: TaxiAdCreate, telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        if not user.phone:
            raise HTTPException(400, "Telefon raqam profilingizda mavjud emas")
        taxi_ad = TaxiAd(
            user_id=user.id,
            wait_time=ad.wait_time,
            seats=ad.seats,
            from_location=json.dumps(ad.from_location),
            to_location=json.dumps(ad.to_location),
            price=ad.price,
            negotiable=ad.negotiable,
            takes_parcel=ad.takes_parcel,
            parcel_size=ad.parcel_size,
            phone=ad.phone or user.phone,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        session.add(taxi_ad)
        await session.commit()
        return {"id": taxi_ad.id, "status": "created"}

@app.get("/api/taxi/ad/{ad_id}")
async def get_taxi_ad(ad_id: int):
    async with AsyncSessionLocal() as session:
        ad = await session.get(TaxiAd, ad_id)
        if not ad:
            raise HTTPException(404, "E'lon topilmadi")
        driver = await session.get(User, ad.user_id)
        return {
            "id": ad.id,
            "driver_name": driver.first_name if driver else "Noma'lum",
            "user_id": ad.user_id,
            "phone": ad.phone,
            "rating": driver.rating if driver else 0,
            "from": ad.from_location,
            "to": ad.to_location,
            "wait_time": ad.wait_time,
            "seats": ad.seats,
            "takes_parcel": ad.takes_parcel,
            "price": ad.price,
            "negotiable": ad.negotiable,
            "is_active": ad.is_active
        }

@app.get("/api/taxi/search")
async def search_taxi(from_location: str, to_location: str, people: int = 1):
    async with AsyncSessionLocal() as session:
        query = select(TaxiAd).where(
            TaxiAd.is_active == True,
            TaxiAd.seats >= people,
            TaxiAd.expires_at > datetime.utcnow()
        )
        result = await session.execute(query)
        ads = result.scalars().all()
        from_loc = json.loads(from_location) if from_location else {}
        to_loc = json.loads(to_location) if to_location else {}
        filtered = []
        for ad in ads:
            ad_from = json.loads(ad.from_location)
            ad_to = json.loads(ad.to_location)
            if from_loc.get("region") and ad_from.get("region") != from_loc.get("region"):
                continue
            if from_loc.get("district") and ad_from.get("district") != from_loc.get("district"):
                continue
            if to_loc.get("region") and ad_to.get("region") != to_loc.get("region"):
                continue
            if to_loc.get("district") and ad_to.get("district") != to_loc.get("district"):
                continue
            filtered.append(ad)
        result_list = []
        for ad in filtered:
            driver = await session.get(User, ad.user_id)
            result_list.append({
                "id": ad.id,
                "driver_name": driver.first_name if driver else "Noma'lum",
                "car_name": driver.car_name if driver else "Noma'lum",
                "rating": driver.rating if driver else 0,
                "from": ad.from_location,
                "to": ad.to_location,
                "wait_time": ad.wait_time,
                "seats": ad.seats,
                "takes_parcel": ad.takes_parcel,
                "price": ad.price,
                "negotiable": ad.negotiable,
                "phone": ad.phone
            })
        return result_list

@app.post("/api/order/create")
async def create_order(order: OrderCreate):
    async with AsyncSessionLocal() as session:
        passenger = await session.execute(
            select(User).where(User.telegram_id == order.passenger_telegram_id)
        )
        passenger = passenger.scalar_one_or_none()
        if not passenger:
            raise HTTPException(404, "Yo'lovchi topilmadi")
        
        ad = await session.get(TaxiAd, order.taxi_ad_id)
        if not ad:
            raise HTTPException(404, "E'lon topilmadi")
        if not ad.is_active:
            raise HTTPException(400, "E'lon faol emas")
        
        # O'ziga o'zi buyurtma bermaslik
        if ad.user_id == passenger.id:
            raise HTTPException(400, "❌ O‘zingizning e’loningizga buyurtma bera olmaysiz!")
        
        # Takroriy buyurtma
        existing = await session.execute(
            select(Order).where(
                Order.taxi_ad_id == ad.id,
                Order.passenger_id == passenger.id,
                Order.status == 'waiting'
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, "❌ Siz bu e'longa allaqachon buyurtma bergansiz!")
        
        new_order = Order(
            taxi_ad_id=ad.id,
            passenger_id=passenger.id,
            driver_id=ad.user_id,
            type=order.type,
            status='waiting'
        )
        session.add(new_order)
        await session.commit()
        
        # Haydovchiga xabar
        driver = await session.get(User, ad.user_id)
        if driver:
            await bot.send_message(
                driver.telegram_id,
                f"🚖 Yangi buyurtma!\n\n"
                f"Yo‘lovchi: {passenger.first_name}\n"
                f"Telefon: {passenger.phone}\n"
                f"Qayerdan: {ad.from_location}\n"
                f"Qayerga: {ad.to_location}\n"
                f"Kutish vaqti: {ad.wait_time} daqiqa\n"
                f"Joylar: {ad.seats}\n"
                f"Narx: {ad.price} so'm\n"
                f"Buyurtma ID: {new_order.id}"
            )
        
        await bot.send_message(
            passenger.telegram_id,
            f"✅ Buyurtma qabul qilindi!\n\n"
            f"Haydovchi: {driver.first_name if driver else 'Noma'lum'}\n"
            f"Telefon: {ad.phone}\n"
            f"Iltimos, haydovchi bilan bog‘laning."
        )
        
        asyncio.create_task(schedule_rating(new_order.id, driver.id if driver else None, passenger.id))
        return {"order_id": new_order.id, "status": "created"}

@app.get("/api/orders/{telegram_id}")
async def get_user_orders(telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        orders = await session.execute(
            select(Order)
            .where(or_(Order.passenger_id == user.id, Order.driver_id == user.id))
            .order_by(Order.created_at.desc())
        )
        result = []
        for o in orders.scalars().all():
            passenger = await session.get(User, o.passenger_id) if o.passenger_id else None
            driver = await session.get(User, o.driver_id) if o.driver_id else None
            taxi_ad = await session.get(TaxiAd, o.taxi_ad_id) if o.taxi_ad_id else None
            result.append({
                "id": o.id,
                "type": o.type,
                "status": o.status,
                "created_at": o.created_at.isoformat(),
                "from": taxi_ad.from_location if taxi_ad else '—',
                "to": taxi_ad.to_location if taxi_ad else '—',
                "driver_name": driver.first_name if driver else '—',
                "driver_phone": driver.phone if driver else '—'
            })
        return result

@app.get("/api/user/{user_id}/taxi-ads")
async def get_user_taxi_ads(user_id: int):
    async with AsyncSessionLocal() as session:
        ads = await session.execute(
            select(TaxiAd).where(TaxiAd.user_id == user_id)
        )
        result = []
        for ad in ads.scalars().all():
            result.append({
                "id": ad.id,
                "from": ad.from_location,
                "to": ad.to_location,
                "wait_time": ad.wait_time,
                "seats": ad.seats,
                "price": ad.price,
                "takes_parcel": ad.takes_parcel,
                "is_active": ad.is_active
            })
        return result

@app.get("/api/user/{user_id}/parcel-ads")
async def get_user_parcel_ads(user_id: int):
    async with AsyncSessionLocal() as session:
        ads = await session.execute(
            select(ParcelAd).where(ParcelAd.user_id == user_id)
        )
        result = []
        for ad in ads.scalars().all():
            result.append({
                "id": ad.id,
                "from": ad.from_location,
                "to": ad.to_location,
                "size": ad.size,
                "is_active": ad.is_active
            })
        return result

@app.delete("/api/taxi/ad/{ad_id}")
async def delete_taxi_ad(ad_id: int, telegram_id: int):
    async with AsyncSessionLocal() as session:
        ad = await session.get(TaxiAd, ad_id)
        if not ad:
            raise HTTPException(404, "E'lon topilmadi")
        user = await session.get(User, ad.user_id)
        if user.telegram_id != telegram_id and not await is_admin(telegram_id):
            raise HTTPException(403, "Ruxsat yo'q")
        ad.is_active = False
        await session.commit()
        return {"status": "ok"}

@app.delete("/api/parcel/ad/{ad_id}")
async def delete_parcel_ad(ad_id: int, telegram_id: int):
    async with AsyncSessionLocal() as session:
        ad = await session.get(ParcelAd, ad_id)
        if not ad:
            raise HTTPException(404, "E'lon topilmadi")
        user = await session.get(User, ad.user_id)
        if user.telegram_id != telegram_id and not await is_admin(telegram_id):
            raise HTTPException(403, "Ruxsat yo'q")
        ad.is_active = False
        await session.commit()
        return {"status": "ok"}

@app.post("/api/parcel/order")
async def create_parcel_order(data: dict, telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        parcel_ad = ParcelAd(
            user_id=user.id,
            from_location=json.dumps(data["from_location"]),
            to_location=json.dumps(data["to_location"]),
            size=data["size"],
            phone=data["phone"],
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        session.add(parcel_ad)
        await session.commit()
        return {"id": parcel_ad.id, "status": "created"}

# ===== HEALTH =====
@app.get("/health")
async def health():
    return {"status": "ok"}

# ===== ROOT =====
@app.get("/")
async def root():
    return {"message": "Taksi Raqami Bot API"}

# ===== WEBAPP =====
@app.get("/webapp")
async def webapp():
    return FileResponse("static/index.html")

@app.get("/admin")
async def admin_page():
    return FileResponse("static/admin.html")

# ===== STARTUP =====
@app.on_event("startup")
async def startup():
    await init_db()
    asyncio.create_task(start_bot())

async def start_bot():
    from bot import dp
    await dp.start_polling(bot)

# ===== CLEANUP EXPIRED ADS =====
async def clean_expired_ads():
    while True:
        await asyncio.sleep(600)  # 10 daqiqa
        async with AsyncSessionLocal() as session:
            expired = await session.execute(
                select(TaxiAd).where(
                    TaxiAd.is_active == True,
                    TaxiAd.expires_at <= datetime.utcnow()
                )
            )
            for ad in expired.scalars().all():
                ad.is_active = False
            await session.commit()

@app.on_event("startup")
async def start_cleaner():
    asyncio.create_task(clean_expired_ads())
