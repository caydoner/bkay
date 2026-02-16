from fastapi import APIRouter, Depends, HTTPException, Header, Response as FastApiResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from typing import List, Optional
from app.database import get_db
from app.models.project import StakeholderResponse as ResponseModel, ProjectGridCell
from app.schemas.project import Response, ResponseCreate
from uuid import UUID

# Geometry and Data processing libraries
import json
import os
import sys
import tempfile
import h3
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.strtree import STRtree
from shapely.errors import ShapelyError
from geoalchemy2.shape import from_shape, to_shape
from fastapi.responses import FileResponse
import re

router = APIRouter(prefix="/responses", tags=["responses"])

def extract_and_validate_geometry(response_data: dict) -> Optional[any]:
    """Extract and validate geometry from response data."""
    if not response_data:
        return None
    
    for key, val in response_data.items():
        if isinstance(val, dict) and "type" in val and "coordinates" in val:
            try:
                # Validate geometry structure
                geom_shape = shape(val)
                
                # Ensure geometry is valid
                if not geom_shape.is_valid:
                    raise ValueError(f"Invalid geometry for field '{key}': {geom_shape}")
                
                # Convert to PostGIS format
                return from_shape(geom_shape, srid=4326)
                
            except (ShapelyError, ValueError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Geometry validation failed for field '{key}': {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to process geometry for field '{key}': {str(e)}"
                )
    
    return None

@router.post("/", response_model=Response)
async def submit_response(
    response: ResponseCreate, 
    db: AsyncSession = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    user_id = int(x_user_id) if x_user_id else 1
    
    # Extract and validate geometry
    geom = extract_and_validate_geometry(response.response_data)

    new_response = ResponseModel(
        project_id=response.project_id,
        h3_index=response.h3_index,
        response_data=response.response_data,
        user_id=user_id,
        geom=geom
    )
    db.add(new_response)
    await db.commit()
    await db.refresh(new_response)
    return new_response

@router.get("/project/{project_id}", response_model=List[Response])
async def get_project_responses(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResponseModel).where(ResponseModel.project_id == project_id))
    return result.scalars().all()

@router.put("/{response_id}", response_model=Response)
async def update_response(
    response_id: UUID,
    response: ResponseCreate,
    db: AsyncSession = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    """Update an existing response."""
    # Find existing response
    result = await db.execute(select(ResponseModel).where(ResponseModel.id == response_id))
    existing_response = result.scalar_one_or_none()
    
    if not existing_response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    # Extract and validate geometry
    geom = extract_and_validate_geometry(response.response_data)
    
    # Update fields
    existing_response.response_data = response.response_data
    existing_response.h3_index = response.h3_index
    existing_response.geom = geom
    
    await db.commit()
    await db.refresh(existing_response)
    return existing_response

@router.delete("/{response_id}")
async def delete_response(
    response_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a response."""
    result = await db.execute(select(ResponseModel).where(ResponseModel.id == response_id))
    response = result.scalar_one_or_none()
    
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    await db.delete(response)
    await db.commit()
    return {"message": "Response deleted successfully"}

@router.get("/export/gpkg")
async def export_responses_gpkg(
    project_id: UUID,
    ids: Optional[str] = None, # Comma-separated list of UUIDs
    db: AsyncSession = Depends(get_db)
):
    """Export responses to a GeoPackage file with refined multi-layer support."""
    # 1. Fetch Responses
    query = select(ResponseModel).where(ResponseModel.project_id == project_id)
    if ids:
        try:
            id_list = [UUID(i.strip()) for i in ids.split(",") if i.strip()]
            if id_list:
                query = query.where(ResponseModel.id.in_(id_list))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ID format in 'ids' parameter")
    
    result = await db.execute(query)
    responses = result.scalars().all()

    if not responses:
        raise HTTPException(status_code=404, detail="No responses found to export")

    # 2. Process Data for multiple layers
    full_data_list = []      # stakeholder_responses
    intersection_geoms = []   # To collect geometries for intersection count analysis
    
    for r in responses:
        # Base attributes
        base_row = {
            "id": str(r.id),
            "user_id": r.user_id,
            "h3_index": r.h3_index,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        
        # Flatten response_data
        if r.response_data:
            for k, v in r.response_data.items():
                clean_key = re.sub(r'[^a-zA-Z0-9_]', '_', k.lower()).strip('_')
                if not clean_key: clean_key = f"attr_{k}"
                if isinstance(v, (dict, list)):
                    if isinstance(v, dict) and "type" in v and "coordinates" in v:
                        continue
                    base_row[clean_key] = json.dumps(v, ensure_ascii=False)
                else:
                    base_row[clean_key] = v
        
        # Extract H3 indices
        row_h3_indices = []
        if r.h3_index:
            row_h3_indices.append(r.h3_index)
        
        if r.response_data:
            for v in r.response_data.values():
                if isinstance(v, dict) and v.get("type") == "GridSelection":
                    indices = v.get("h3_indices") or v.get("original_selection")
                    if isinstance(indices, list):
                        row_h3_indices.extend(indices)
                    elif isinstance(indices, str):
                        row_h3_indices.append(indices)
        
        # 1. H3 Geometry
        h3_poly = None
        if row_h3_indices:
            h3_polys = []
            from shapely.ops import unary_union
            for h_idx in set(row_h3_indices):
                try:
                    coords = h3.cell_to_boundary(h_idx)
                    h3_polys.append(Polygon([(lng, lat) for lat, lng in coords]))
                except Exception: pass
            if h3_polys:
                h3_poly = unary_union(h3_polys)
            
        # 2. Hand-drawn Geometry
        hand_drawn_poly = None
        if r.geom:
            try:
                hand_drawn_poly = to_shape(r.geom)
            except Exception: pass
            
        # Fallback: check response_data for geometries if r.geom is empty
        if not hand_drawn_poly and r.response_data:
            for v in r.response_data.values():
                if isinstance(v, dict) and v.get("type") in ["Polygon", "Point", "LineString"]:
                    try:
                        hand_drawn_poly = shape(v)
                        break
                    except Exception: pass
        
        # 3. stakeholder_responses Layer (Priority: Hand-drawn > H3)
        priority_geom = hand_drawn_poly or h3_poly
        full_data_list.append({**base_row, "geometry": priority_geom})
        
        # 4. Collection for high_res_grid_intersections
        # Logic: use the combined geometry of the response (Hand-drawn AND/OR H3)
        # We use union here because the user wants a count of overlaps
        resp_geom = None
        if hand_drawn_poly and h3_poly:
            try:
                resp_geom = hand_drawn_poly.union(h3_poly)
            except Exception: pass
        else:
            resp_geom = hand_drawn_poly or h3_poly
            
        if resp_geom and not resp_geom.is_empty:
            intersection_geoms.append(resp_geom)

    # 3. Fetch High-Res Grids
    high_res_grid_list = []
    if intersection_geoms:
        try:
            res_query = select(func.max(ProjectGridCell.resolution)).where(ProjectGridCell.project_id == project_id)
            res_result = await db.execute(res_query)
            max_res = res_result.scalar()
            
            if max_res is not None:
                from shapely.ops import unary_union
                combined_area = unary_union(intersection_geoms)
                combined_wkt = combined_area.wkt
                
                grid_query = select(
                    ProjectGridCell.h3_index,
                    ProjectGridCell.resolution,
                    ProjectGridCell.geometry
                ).where(
                    ProjectGridCell.project_id == project_id,
                    ProjectGridCell.resolution == max_res,
                    func.ST_Intersects(ProjectGridCell.geometry, func.ST_GeomFromText(combined_wkt, 4326))
                )
                
                grid_result = await db.execute(grid_query)
                grid_rows = grid_result.all()
                
                # Spatial index for intersection count
                tree = STRtree(intersection_geoms)
                
                for grow in grid_rows:
                    try:
                        cell_poly = to_shape(grow.geometry)
                        # Count intersections using spatial index
                        # query(predicate='intersects') returns indices of geometries in tree that intersect cell_poly
                        intersecting_indices = tree.query(cell_poly, predicate='intersects')
                        count = len(intersecting_indices)
                        
                        high_res_grid_list.append({
                            "h3_index": grow.h3_index,
                            "resolution": grow.resolution,
                            "intersection_count": count,
                            "geometry": cell_poly
                        })
                    except Exception: pass
        except Exception: pass

    # 4. Save to temporary GPKG
    fd, path = tempfile.mkstemp(suffix=".gpkg")
    try:
        os.close(fd)
        # Check available engines
        engine = 'pyogrio'
        try:
            import pyogrio
        except ImportError:
            engine = 'fiona'
        
        # Layer 1: stakeholder_responses
        gdf_full = gpd.GeoDataFrame(pd.DataFrame(full_data_list), geometry="geometry", crs="EPSG:4326")
        gdf_full.to_file(path, driver="GPKG", layer="stakeholder_responses", engine=engine)
        
        # Layer 2: grid_intersections
        if high_res_grid_list:
            gpd.GeoDataFrame(pd.DataFrame(high_res_grid_list), geometry="geometry", crs="EPSG:4326").to_file(path, driver="GPKG", layer="grid_intersections", engine=engine, mode='a')
        
        return FileResponse(
            path, 
            filename=f"project_{project_id}_responses.gpkg",
            media_type="application/geopackage+sqlite3"
        )
    except Exception as e:
        print(f"DEBUG: CRITICAL - GPKG write failed: {str(e)}")
        if os.path.exists(path):
            os.remove(path)
        raise HTTPException(status_code=500, detail=f"GeoPackage creation failed: {str(e)}")
