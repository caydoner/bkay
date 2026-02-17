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

    # 2. Process Data for Dual-Layer Export
    # orig_layers_data: { field_name: [list_of_records_with_attrs] }
    # analysis_geoms: { field_name: [list_of_shapely_geoms] }
    orig_layers_data = {}
    analysis_geoms = {}
    
    def add_to_orig(cat_name, row):
        clean_name = f"orig_{re.sub(r'[^a-zA-Z0-9_]', '_', cat_name.lower()).strip('_')}"
        if clean_name not in orig_layers_data:
            orig_layers_data[clean_name] = []
        orig_layers_data[clean_name].append(row)
        
    def add_to_analysis(cat_name, geom):
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', cat_name.lower()).strip('_')
        if clean_name not in analysis_geoms:
            analysis_geoms[clean_name] = []
        analysis_geoms[clean_name].append(geom)

    for r in responses:
        # 2a. Extract Base Attributes
        base_attrs = {
            "id": str(r.id),
            "user_id": r.user_id,
            "h3_index": r.h3_index,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        
        # 2b. Flatten non-geometry attributes
        extra_attrs = {}
        row_geoms = {} # { field_name: shapely_geom }
        
        if r.response_data:
            for k, v in r.response_data.items():
                # Detect Hand-drawn Geometry
                if isinstance(v, dict) and "type" in v and "coordinates" in v:
                    try:
                        g = shape(v)
                        row_geoms[k] = g
                        add_to_analysis(k, g)
                    except Exception: pass
                    continue
                
                # Detect H3 Grid Selection
                elif isinstance(v, dict) and v.get("type") == "GridSelection":
                    indices = v.get("h3_indices") or v.get("original_selection")
                    if not indices: continue
                    if isinstance(indices, str): indices = [indices]
                    
                    h3_polys = []
                    for h_idx in set(indices):
                        try:
                            coords = h3.cell_to_boundary(h_idx)
                            h3_polys.append(Polygon([(lng, lat) for lat, lng in coords]))
                        except Exception: pass
                    
                    if h3_polys:
                        from shapely.ops import unary_union
                        h3_union = unary_union(h3_polys)
                        row_geoms[k] = h3_union
                        add_to_analysis(k, h3_union)
                    continue

                # Normal Attribute
                clean_key = re.sub(r'[^a-zA-Z0-9_]', '_', k.lower()).strip('_')
                if not clean_key: clean_key = f"attr_{k}"
                if isinstance(v, (dict, list)):
                    extra_attrs[clean_key] = json.dumps(v, ensure_ascii=False)
                else:
                    extra_attrs[clean_key] = v
        
        # 2c. Add to original layers
        all_attrs = {**base_attrs, **extra_attrs}
        for field_name, geom in row_geoms.items():
            if geom and not geom.is_empty:
                add_to_orig(field_name, {**all_attrs, "geometry": geom})
                
        # 2d. Handle primary H3 index and legacy geom
        if r.h3_index:
            try:
                coords = h3.cell_to_boundary(r.h3_index)
                p_geom = Polygon([(lng, lat) for lat, lng in coords])
                add_to_orig("primary_h3_selection", {**all_attrs, "geometry": p_geom})
                add_to_analysis("primary_h3_selection", p_geom)
            except Exception: pass
        if r.geom and not row_geoms:
            try:
                l_geom = to_shape(r.geom)
                add_to_orig("legacy_geom", {**all_attrs, "geometry": l_geom})
                add_to_analysis("legacy_geom", l_geom)
            except Exception: pass

    # 3. Perform Intersection Analysis Per Category
    layer_dfs = {}
    
    # 3a. Create Original Data layers
    for layer_name, data in orig_layers_data.items():
        if data:
            layer_dfs[layer_name] = gpd.GeoDataFrame(pd.DataFrame(data), geometry="geometry", crs="EPSG:4326")

    # 3b. Create Intersection Analysis layers
    try:
        res_query = select(func.max(ProjectGridCell.resolution)).where(ProjectGridCell.project_id == project_id)
        res_result = await db.execute(res_query)
        max_res = res_result.scalar()
        
        if max_res is not None and analysis_geoms:
            from shapely.ops import unary_union
            for cat_name, geoms in analysis_geoms.items():
                combined_area = unary_union(geoms)
                if combined_area.is_empty: continue
                
                grid_query = select(
                    ProjectGridCell.h3_index,
                    ProjectGridCell.resolution,
                    ProjectGridCell.geometry
                ).where(
                    ProjectGridCell.project_id == project_id,
                    ProjectGridCell.resolution == max_res,
                    func.ST_Intersects(ProjectGridCell.geometry, func.ST_GeomFromText(combined_area.wkt, 4326))
                )
                
                grid_result = await db.execute(grid_query)
                grid_rows = grid_result.all()
                if not grid_rows: continue
                
                tree = STRtree(geoms)
                analysis_rows = []
                for grow in grid_rows:
                    try:
                        cell_poly = to_shape(grow.geometry)
                        intersecting_indices = tree.query(cell_poly, predicate='intersects')
                        analysis_rows.append({
                            "h3_index": grow.h3_index,
                            "resolution": grow.resolution,
                            "intersection_count": len(intersecting_indices),
                            "geometry": cell_poly
                        })
                    except Exception: pass
                
                if analysis_rows:
                    layer_dfs[f"intersections_{cat_name}"] = gpd.GeoDataFrame(pd.DataFrame(analysis_rows), geometry="geometry", crs="EPSG:4326")
    except Exception as e:
        print(f"DEBUG: Intersection analysis failed: {str(e)}")

    # 4. Save to temporary GPKG
    if not layer_dfs:
        raise HTTPException(status_code=404, detail="No data found to export")

    fd, path = tempfile.mkstemp(suffix=".gpkg")
    try:
        os.close(fd)
        engine = 'pyogrio'
        try:
            import pyogrio
        except ImportError:
            engine = 'fiona'
        
        first_layer = True
        for layer_name, gdf in layer_dfs.items():
            mode = 'w' if first_layer else 'a'
            gdf.to_file(path, driver="GPKG", layer=layer_name, engine=engine, mode=mode)
            first_layer = False
        
        return FileResponse(
            path, 
            filename=f"project_{project_id}_export.gpkg",
            media_type="application/geopackage+sqlite3"
        )
    except Exception as e:
        if os.path.exists(path): os.remove(path)
        raise HTTPException(status_code=500, detail=f"GeoPackage creation failed: {str(e)}")
