from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import DATABASE_URL

Base = declarative_base()
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------- MODELLAR ----------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, nullable=False)
    first_name = Column(String)
    phone = Column(String, nullable=True)
    car_name = Column(String, nullable=True)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    language = Column(String, default="uz")  # uz, uz_cyrl, ru, en
    theme = Column(String, default="light")  # light, dark
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    taxi_ads = relationship("TaxiAd", back_populates="user")
    parcel_ads = relationship("ParcelAd", back_populates="user")
    orders_as_driver = relationship("Order", foreign_keys="Order.driver_id", back_populates="driver")
    orders_as_passenger = relationship("Order", foreign_keys="Order.passenger_id", back_populates="passenger")
    ratings_given = relationship("Rating", foreign_keys="Rating.rater_id", back_populates="rater")
    ratings_received = relationship("Rating", foreign_keys="Rating.rated_id", back_populates="rated")

class TaxiAd(Base):
    __tablename__ = "taxi_ads"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wait_time = Column(Integer)  # daqiqada
    seats = Column(Integer)
    from_location = Column(Text)   # JSON: {"region":"", "district":"", "neighborhood":""}
    to_location = Column(Text)     # JSON: {"region":"", "district":""}
    price = Column(Float)
    negotiable = Column(Boolean, default=True)
    takes_parcel = Column(Boolean, default=False)
    parcel_size = Column(String, nullable=True)  # kichik, o'rta, katta
    phone = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="taxi_ads")
    orders = relationship("Order", back_populates="taxi_ad")

class ParcelAd(Base):
    __tablename__ = "parcel_ads"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_location = Column(Text)   # JSON: {"region":"", "district":"", "neighborhood":""}
    to_location = Column(Text)     # JSON: {"region":"", "district":""}
    size = Column(String)          # kichik, o'rta, katta
    phone = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="parcel_ads")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    taxi_ad_id = Column(Integer, ForeignKey("taxi_ads.id"), nullable=True)
    parcel_ad_id = Column(Integer, ForeignKey("parcel_ads.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    passenger_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="waiting")  # waiting, completed, cancelled
    type = Column(String)  # taxi, parcel
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    taxi_ad = relationship("TaxiAd", back_populates="orders")
    parcel_ad = relationship("ParcelAd")
    driver = relationship("User", foreign_keys=[driver_id], back_populates="orders_as_driver")
    passenger = relationship("User", foreign_keys=[passenger_id], back_populates="orders_as_passenger")

class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    rater_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rated_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer)  # 1-5
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")
    rater = relationship("User", foreign_keys=[rater_id], back_populates="ratings_given")
    rated = relationship("User", foreign_keys=[rated_id], back_populates="ratings_received")

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    role = Column(String, default="admin")

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text)

class MandatoryChannel(Base):
    __tablename__ = "mandatory_channels"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)

class Advertisement(Base):
    __tablename__ = "advertisements"
    id = Column(Integer, primary_key=True)
    text = Column(Text)
    media_type = Column(String, nullable=True)  # photo, video
    media_file_id = Column(String, nullable=True)
    button_text = Column(String, nullable=True)
    button_url = Column(String, nullable=True)
    target_segment = Column(String, default="all")  # all, drivers, passengers
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ---------- YORDAMCHI FUNKTSIYALAR ----------
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
