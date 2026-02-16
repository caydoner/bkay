from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import UserCreate, User as UserSchema
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserSchema)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(UserModel).where(UserModel.username == user.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    hashed_pwd = pwd_context.hash(user.password)
    new_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pwd,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_approved=user.role == "ADMIN" # Auto-approve admins or handle manually
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login")
async def login(identifier: str, password: str, db: AsyncSession = Depends(get_db)):
    # Check email or username
    result = await db.execute(
        select(UserModel).where(
            (UserModel.email == identifier) | (UserModel.username == identifier)
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Account not approved yet")
        
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "message": "Login successful"
    }
