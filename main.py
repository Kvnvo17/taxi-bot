from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import asyncio

from database import AsyncSessionLocal, User, TaxiAd, ParcelAd, Order, Rating, Complaint, Admin, Setting, MandatoryChannel
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from config import WEBAPP_URL, ADMIN_IDS
from bot import bot, schedule_rating

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static fayllar
app.mount("/static", StaticFiles(directory="static"), name="static")

# Web App sahifasi
@app.get("/webapp")
async def webapp():
    return FileResponse("static/index.html")

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}

# ---------- API MODELLARI ----------
class TaxiAdCreate(BaseModel):
    wait_time: int
    seats: int
    from_location: dict  # region, district, neighborhood
    to_location: dict    # region, district
    price: float
    negotiable: bool
    takes_parcel: bool
    parcel_size: Optional[str]
    phone: str

class ParcelAdCreate(BaseModel):
    from_location: dict
    to_location: dict
    size: str
    phone: str

class OrderCreate(BaseModel):
    taxi_ad_id: Optional[int]
    parcel_ad_id: Optional[int]
    passenger_telegram_id: int
    type: str  # taxi, parcel

class RatingCreate(BaseModel):
    order_id: int
    score: int
    comment: Optional[str]

class ComplaintCreate(BaseModel):
    order_id: Optional[int]
    text: str

# ---------- API ENDPOINTLAR ----------
@app.get("/api/user/{telegram_id}")
async def get_user(telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(select(User).where(User.telegram_id == telegram_id))
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
        user = await session.execute(select(User).where(User.telegram_id == data["telegram_id"]))
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
        user = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        # phone ni majburiy tekshirish
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
            phone=ad.phone or user.phone
        )
        session.add(taxi_ad)
        await session.commit()
        # Mos yo‘lovchilarni topish va xabar berish (agar ular kutayotgan bo‘lsa)
        # Buni keyin qilamiz
        return {"id": taxi_ad.id, "status": "created"}

@app.post("/api/parcel/ad")
async def create_parcel_ad(ad: ParcelAdCreate, telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        if not user.phone:
            raise HTTPException(400, "Telefon raqam profilingizda mavjud emas")
        parcel_ad = ParcelAd(
            user_id=user.id,
            from_location=json.dumps(ad.from_location),
            to_location=json.dumps(ad.to_location),
            size=ad.size,
            phone=ad.phone or user.phone
        )
        session.add(parcel_ad)
        await session.commit()
        return {"id": parcel_ad.id, "status": "created"}

@app.get("/api/taxi/search")
async def search_taxi(from_location: str, to_location: str, people: int = 1):
    # from_location va to_location JSON string, masalan {"region":"..."}
    # Oddiy qidiruv: barcha faol taksi e’lonlari
    async with AsyncSessionLocal() as session:
        # Biz joylashuv bo‘yicha filter qilamiz (region va district)
        query = select(TaxiAd).where(
            TaxiAd.is_active == True,
            TaxiAd.seats >= people
        )
        # Filtrlarni qo‘shish: from_location da region va district mos kelishi kerak
        # Buni JSON bilan solishtirish qiyin, shuning uchun SQLite da JSON funksiyalari ishlatiladi.
        # Soddalashtirib, barcha e’lonlarni olamiz va keyin Python da filtrlaymiz.
        result = await session.execute(query)
        ads = result.scalars().all()
        # filtrlash
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
        # Natijani formatlash
        result_list = []
        for ad in filtered:
            driver = await session.get(User, ad.user_id)
            result_list.append({
                "id": ad.id,
                "driver_name": driver.first_name if driver else "Noma'lum",
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
        passenger = await session.execute(select(User).where(User.telegram_id == order.passenger_telegram_id))
        passenger = passenger.scalar_one_or_none()
        if not passenger:
            raise HTTPException(404, "Passenger not found")
        if not passenger.phone:
            raise HTTPException(400, "Telefon raqam profilingizda mavjud emas")
        # Taksi e’lonini olish
        ad = await session.get(TaxiAd, order.taxi_ad_id)
        if not ad:
            raise HTTPException(404, "Taxi ad not found")
        if not ad.is_active:
            raise HTTPException(400, "E’lon faol emas")
        # Buyurtma yaratish
        new_order = Order(
            taxi_ad_id=ad.id,
            passenger_id=passenger.id,
            driver_id=ad.user_id,
            type="taxi",
            status="waiting"
        )
        session.add(new_order)
        await session.commit()
        # Taksist va yo‘lovchiga xabar yuborish
        driver = await session.get(User, ad.user_id)
        # Taksistga xabar
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
                f"Kelishiladi: {'Ha' if ad.negotiable else 'Yo‘q'}\n"
                f"Pochta: {'Ha' if ad.takes_parcel else 'Yo‘q'}\n"
                f"Buyurtma ID: {new_order.id}"
            )
        # Yo‘lovchiga taksist telefon raqami
        await bot.send_message(
            passenger.telegram_id,
            f"✅ Buyurtma qabul qilindi!\n\n"
            f"Haydovchi: {driver.first_name if driver else 'Noma\'lum'}\n"
            f"Telefon: {ad.phone}\n"
            f"Iltimos, haydovchi bilan bog‘laning."
        )
        # Reyting so‘rovini 5 soatdan keyin rejalashtirish
        asyncio.create_task(schedule_rating(new_order.id, driver.id if driver else None, passenger.id))
        return {"order_id": new_order.id, "status": "created"}

@app.get("/api/orders/{telegram_id}")
async def get_user_orders(telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        # orders where user is passenger or driver
        orders = await session.execute(
            select(Order)
            .where(or_(Order.passenger_id == user.id, Order.driver_id == user.id))
            .order_by(Order.created_at.desc())
        )
        orders = orders.scalars().all()
        result = []
        for o in orders:
            result.append({
                "id": o.id,
                "type": o.type,
                "status": o.status,
                "created_at": o.created_at.isoformat(),
                "driver_id": o.driver_id,
                "passenger_id": o.passenger_id,
                "taxi_ad_id": o.taxi_ad_id,
                "parcel_ad_id": o.parcel_ad_id
            })
        return result

@app.get("/api/ratings/{user_id}")
async def get_user_ratings(user_id: int):
    async with AsyncSessionLocal() as session:
        ratings = await session.execute(select(Rating).where(Rating.rated_id == user_id))
        ratings = ratings.scalars().all()
        return [{"score": r.score, "comment": r.comment, "created_at": r.created_at.isoformat()} for r in ratings]

@app.post("/api/complaint")
async def create_complaint(complaint: ComplaintCreate, telegram_id: int):
    async with AsyncSessionLocal() as session:
        user = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = user.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        comp = Complaint(user_id=user.id, order_id=complaint.order_id, text=complaint.text)
        session.add(comp)
        await session.commit()
        # Adminga xabar
        for admin_id in ADMIN_IDS:
            await bot.send_message(admin_id, f"📢 Shikoyat: {complaint.text}\nFoydalanuvchi: {user.first_name}")
        return {"status": "ok"}

# ---------- ISHGA TUSHIRISH ----------
@app.on_event("startup")
async def startup():
    from database import init_db
    await init_db()
    # botni alohida processda ishga tushirish yoki asyncio.create_task
    asyncio.create_task(start_bot())

async def start_bot():
    from bot import dp, bot
    await dp.start_polling(bot)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
