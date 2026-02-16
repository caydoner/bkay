from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from app.database import get_db
from app.models.project import ProjectArea, ProjectGridCell, StakeholderResponse
from geoalchemy2.elements import WKTElement
from shapely.geometry import shape, mapping
import json
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/areas", tags=["areas"])


class AreaCreate(BaseModel):
    project_id: UUID
    name: str
    description: Optional[str] = None
    boundary_geom: Optional[dict] = None
    min_cell_area_km2: float = 0.0003  # ~300 m²
    max_cell_area_km2: float = 5.0     # 5 km²
    num_resolutions: int = 8


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    boundary_geom: Optional[dict] = None
    min_cell_area_km2: Optional[float] = None
    max_cell_area_km2: Optional[float] = None
    num_resolutions: Optional[int] = None


@router.get("/{project_id}")
async def get_project_areas(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all areas for a project"""
    query = select(
        ProjectArea.id,
        ProjectArea.name,
        ProjectArea.description,
        ProjectArea.min_cell_area_km2,
        ProjectArea.max_cell_area_km2,
        ProjectArea.num_resolutions,
        ProjectArea.grids_generated,
        ProjectArea.created_at,
        func.ST_AsGeoJSON(ProjectArea.boundary_geom).label("geojson")
    ).where(ProjectArea.project_id == project_id).order_by(ProjectArea.created_at)
    
    result = await db.execute(query)
    rows = result.all()
    
    areas = []
    for row in rows:
        area_data = {
            "id": str(row.id),
            "name": row.name,
            "description": row.description,
            "min_cell_area_km2": row.min_cell_area_km2,
            "max_cell_area_km2": row.max_cell_area_km2,
            "num_resolutions": row.num_resolutions,
            "grids_generated": row.grids_generated,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "boundary_geom": json.loads(row.geojson) if row.geojson else None
        }
        areas.append(area_data)
    
    return areas


@router.get("/{project_id}/{area_id}")
async def get_area(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific area"""
    query = select(
        ProjectArea.id,
        ProjectArea.name,
        ProjectArea.description,
        ProjectArea.min_cell_area_km2,
        ProjectArea.max_cell_area_km2,
        ProjectArea.num_resolutions,
        ProjectArea.grids_generated,
        ProjectArea.created_at,
        func.ST_AsGeoJSON(ProjectArea.boundary_geom).label("geojson")
    ).where(
        ProjectArea.project_id == project_id,
        ProjectArea.id == area_id
    )
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Area not found")
    
    return {
        "id": str(row.id),
        "name": row.name,
        "description": row.description,
        "min_cell_area_km2": row.min_cell_area_km2,
        "max_cell_area_km2": row.max_cell_area_km2,
        "num_resolutions": row.num_resolutions,
        "grids_generated": row.grids_generated,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "boundary_geom": json.loads(row.geojson) if row.geojson else None
    }


@router.post("/")
async def create_area(
    area: AreaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new area"""
    new_area = ProjectArea(
        project_id=area.project_id,
        name=area.name,
        description=area.description,
        min_cell_area_km2=area.min_cell_area_km2,
        max_cell_area_km2=area.max_cell_area_km2,
        num_resolutions=area.num_resolutions
    )
    
    if area.boundary_geom:
        geom_shape = shape(area.boundary_geom)
        new_area.boundary_geom = WKTElement(geom_shape.wkt, srid=4326)
    
    db.add(new_area)
    await db.commit()
    await db.refresh(new_area)
    
    return {"id": str(new_area.id), "message": "Alan başarıyla oluşturuldu"}


@router.patch("/{project_id}/{area_id}")
async def update_area(
    project_id: UUID,
    area_id: UUID,
    update: AreaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an area"""
    result = await db.execute(
        select(ProjectArea).where(
            ProjectArea.project_id == project_id,
            ProjectArea.id == area_id
        )
    )
    area = result.scalar_one_or_none()
    
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    
    if update.name is not None:
        area.name = update.name
    if update.description is not None:
        area.description = update.description
    if update.min_cell_area_km2 is not None:
        area.min_cell_area_km2 = update.min_cell_area_km2
    if update.max_cell_area_km2 is not None:
        area.max_cell_area_km2 = update.max_cell_area_km2
    if update.num_resolutions is not None:
        area.num_resolutions = update.num_resolutions
    if update.boundary_geom is not None:
        geom_shape = shape(update.boundary_geom)
        area.boundary_geom = WKTElement(geom_shape.wkt, srid=4326)
    
    await db.commit()
    return {"message": "Alan başarıyla güncellendi"}


@router.delete("/{project_id}/{area_id}")
async def delete_area(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete an area and its grids"""
    # First delete grids
    await db.execute(
        delete(ProjectGridCell).where(ProjectGridCell.area_id == area_id)
    )
    
    # Then delete the area
    await db.execute(
        delete(ProjectArea).where(
            ProjectArea.project_id == project_id,
            ProjectArea.id == area_id
        )
    )
    
    await db.commit()
    return {"message": "Alan ve gridleri silindi"}


@router.get("/{project_id}/{area_id}/check-data")
async def check_area_data(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Check if an area has any data entries (responses)"""
    # Check for responses linked to this area
    count_query = select(func.count(StakeholderResponse.id)).where(
        StakeholderResponse.area_id == area_id
    )
    result = await db.execute(count_query)
    area_response_count = result.scalar() or 0
    
    # Also check for responses linked to grid cells in this area
    grid_cells_query = select(ProjectGridCell.h3_index).where(
        ProjectGridCell.area_id == area_id
    )
    grid_result = await db.execute(grid_cells_query)
    h3_indices = [row[0] for row in grid_result.all()]
    
    grid_response_count = 0
    if h3_indices:
        grid_count_query = select(func.count(StakeholderResponse.id)).where(
            StakeholderResponse.h3_index.in_(h3_indices)
        )
        grid_result = await db.execute(grid_count_query)
        grid_response_count = grid_result.scalar() or 0
    
    total_count = area_response_count + grid_response_count
    
    return {
        "has_data": total_count > 0,
        "response_count": total_count,
        "message": f"Bu alan için {total_count} adet veri girişi bulunmaktadır." if total_count > 0 else "Bu alan için veri girişi bulunmamaktadır."
    }
