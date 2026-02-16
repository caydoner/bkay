import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure async driver for asyncpg
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=True) if DATABASE_URL else None
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
) if engine else None

async def get_db():
    if not AsyncSessionLocal:
        raise Exception("DATABASE_URL not set in .env")
    async with AsyncSessionLocal() as session:
        yield session
