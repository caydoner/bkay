from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.models.project import Project as ProjectModel
from app.schemas.project import Project, ProjectCreate
from uuid import UUID

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=List[Project])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectModel).order_by(ProjectModel.created_at.desc()))
    return result.scalars().all()

@router.post("/", response_model=Project)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    new_project = ProjectModel(**project.dict(), admin_id=1) # Hardcoded admin_id for now
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: UUID, update_data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for key, value in update_data.items():
        if key == "boundary_geom" and value:
            from geoalchemy2.shape import from_shape
            from shapely.geometry import shape
            # Convert GeoJSON to Shapely then to WKB
            # In our case, we can just use the GeoJSON WKT if GEOMETRY type handles it,
            # but better to use from_shape
            geom = shape(value)
            project.boundary_geom = from_shape(geom, srid=4326)
        elif hasattr(project, key):
            setattr(project, key, value)
            
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/users/public")
async def get_public_users(db: AsyncSession = Depends(get_db)):
    from app.models.user import User as UserModel
    result = await db.execute(select(UserModel).where(UserModel.role == "PUBLIC", UserModel.is_approved == True))
    return result.scalars().all()
