from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import User as UserSchema
from sqlalchemy import delete

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserSchema])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).order_by(UserModel.created_at.desc()))
    return result.scalars().all()

@router.patch("/{user_id}/approve")
async def approve_user(user_id: int, approved: bool, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = approved
    await db.commit()
    return {"message": "Success", "is_approved": user.is_approved}

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "ADMIN":
        # Check if it's the only admin? (Optional safety)
        pass

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}
