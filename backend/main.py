from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import projects, grids, responses, schema, auth, users, areas, mvt
from app.database import engine
from app.models.project import Base
import app.models.user  # Ensure User model is loaded
from sqlalchemy import text

app = FastAPI(title="Stakeholder Mapping API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Ensure tables and PostGIS
    async with engine.begin() as conn:
        # Enable PostGIS and UUID
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        # Rename 'user' table to 'users' if it exists (Supabase compatibility)
        # We do this BEFORE create_all so SQLAlchemy finds the existing table
        try:
            # Check for 'user' table existence using a safe method that won't poison transaction easily
            # But safer to just try-except on a specific check
            check_user = await conn.execute(text("SELECT 1 FROM information_schema.tables WHERE table_name = 'user'"))
            check_users = await conn.execute(text("SELECT 1 FROM information_schema.tables WHERE table_name = 'users'"))
            
            if check_user.scalar() and not check_users.scalar():
                await conn.execute(text("ALTER TABLE \"user\" RENAME TO users;"))
                print("Successfully renamed 'user' table to 'users'")
        except Exception as e:
            print(f"Table rename check skipped/failed: {e}")

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

        # Minor migrations: Ensure all columns exist
        try:
            # Re-check columns for tables that already existed
            await conn.execute(text("ALTER TABLE project_columns ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';"))
            await conn.execute(text("ALTER TABLE project_columns ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';"))
            await conn.execute(text("ALTER TABLE project_grid_cells ADD COLUMN IF NOT EXISTS area_id UUID;"))
            await conn.execute(text("ALTER TABLE stakeholder_responses ADD COLUMN IF NOT EXISTS area_id UUID;"))
        except Exception as e:
            print(f"Migration check skip/failure: {e}")

    # Create default admin if not exists
    from app.routers.auth import pwd_context
    from app.models.user import User as UserModel
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSessionLocal() as db:
        from sqlalchemy.future import select
        result = await db.execute(select(UserModel).where(UserModel.username == "admin"))
        if not result.scalar_one_or_none():
            hashed_pwd = pwd_context.hash("admin123")
            admin_user = UserModel(
                username="admin",
                email="admin@local.com",
                hashed_password=hashed_pwd,
                role="ADMIN",
                is_approved=True
            )
            db.add(admin_user)
            await db.commit()

# Include Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(grids.router)
app.include_router(responses.router)
app.include_router(schema.router)
app.include_router(users.router)
app.include_router(areas.router)
app.include_router(mvt.router)

@app.get("/")
async def root():
    return {"message": "Stakeholder Mapping API is running on Local Docker"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
