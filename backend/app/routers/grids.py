from sqlalchemy.dialects.postgresql import JSON, JSONB
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete, insert, update, text
from fastapi.responses import StreamingResponse
import asyncio
import math
from app.database import get_db
from app.models.project import Project, ProjectGridCell, ProjectArea, StakeholderResponse
from geoalchemy2.elements import WKTElement
import h3
import json
import time
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/grids", tags=["grids"])

# H3 resolution approximate cell areas in km² (converted from m²)
H3_RESOLUTION_AREAS_KM2 = {
    0: 4357449.416,      # ~4.4 million km²
    1: 609788.442,       # ~610,000 km²
    2: 86801.780,        # ~86,800 km²
    3: 12393.435,        # ~12,400 km²
    4: 1770.348,         # ~1,770 km²
    5: 252.904,          # ~253 km²
    6: 36.129,           # ~36 km²
    7: 5.161,            # ~5.2 km²
    8: 0.737,            # ~0.74 km² (737,000 m²)
    9: 0.105,            # ~0.11 km² (105,000 m²)
    10: 0.015,           # ~0.015 km² (15,000 m²)
    11: 0.00215,         # ~0.002 km² (2,150 m²)
    12: 0.000307,        # ~0.0003 km² (307 m²)
    13: 0.0000439,       # ~44 m²
    14: 0.00000627,      # ~6 m²
    15: 0.000000895      # ~0.9 m²
}

# Zoom to H3 Resolution mapping
ZOOM_TO_H3_RESOLUTION = {
    5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 12
}


def get_resolution_for_area_km2(area_km2: float) -> int:
    """Get the H3 resolution that produces cells closest to the target area (in km²)"""
    best_res = 8
    best_diff = float('inf')
    
    for res, res_area in H3_RESOLUTION_AREAS_KM2.items():
        diff = abs(res_area - area_km2)
        if diff < best_diff:
            best_diff = diff
            best_res = res
    
    return best_res


def calculate_resolution_range_km2(min_area_km2: float, max_area_km2: float, num_levels: int = 8) -> List[int]:
    """
    Calculate H3 resolutions that produce evenly distributed cell areas
    between min and max areas (in km²).
    """
    # Get resolutions for min and max areas
    min_res = get_resolution_for_area_km2(min_area_km2)  # Smallest area = highest res
    max_res = get_resolution_for_area_km2(max_area_km2)  # Largest area = lowest res
    
    # Ensure min_res >= max_res (higher number = smaller cells)
    if min_res < max_res:
        min_res, max_res = max_res, min_res
    
    # Clamp to valid H3 range
    # Capped at 11 (15m) to prevent generating millions of cells for large project areas
    min_res = min(max(min_res, 3), 11)
    max_res = min(max(max_res, 0), 11)
    
    # Generate evenly spaced resolutions
    available_range = min_res - max_res + 1
    
    if num_levels >= available_range:
        return list(range(max_res, min_res + 1))
    
    # Select evenly distributed resolutions
    step = available_range / num_levels
    resolutions = []
    for i in range(num_levels):
        res = max_res + int(i * step)
        if res not in resolutions and res >= max_res and res <= min_res:
            resolutions.append(res)
    
    # Ensure we include both endpoints
    if max_res not in resolutions:
        resolutions.insert(0, max_res)
    if min_res not in resolutions:
        resolutions.append(min_res)
    
    return sorted(set(resolutions))


def get_resolution_for_zoom(zoom: int) -> int:
    """Get appropriate H3 resolution for a given map zoom level"""
    if zoom <= 5:
        return 3
    elif zoom >= 14:
        return 11  # Capped at 11 (15m) to prevent OOM/database limits
    return ZOOM_TO_H3_RESOLUTION.get(zoom, 8)


def generate_cells_for_resolution(geojson: dict, resolution: int) -> set:
    """Generate H3 cells for a given geometry at specified resolution"""
    cells = set()
    try:
        if geojson["type"] == "Polygon":
            exterior = [(c[1], c[0]) for c in geojson["coordinates"][0]]
            holes = [[(c[1], c[0]) for c in hole] for hole in geojson["coordinates"][1:]]
            poly = h3.LatLngPoly(exterior, *holes)
            cells = h3.polygon_to_cells(poly, resolution)
        elif geojson["type"] == "MultiPolygon":
            for poly_coords in geojson["coordinates"]:
                ext = [(c[1], c[0]) for c in poly_coords[0]]
                hls = [[(c[1], c[0]) for c in ring] for ring in poly_coords[1:]]
                cells.update(h3.polygon_to_cells(h3.LatLngPoly(ext, *hls), resolution))
    except Exception as e:
        print(f"Error generating cells for resolution {resolution}: {e}")
    return cells


def format_area_km2(area_km2: float) -> str:
    """Format area in km² for display"""
    if area_km2 >= 1:
        return f"{area_km2:.2f} km²"
    else:
        # Convert to m² for small areas
        area_m2 = area_km2 * 1_000_000
        return f"{int(area_m2):,} m²"


@router.get("/resolution-info")
async def get_resolution_info():
    """Get H3 resolution to area mapping info (in km²)"""
    return {
        "resolution_areas_km2": H3_RESOLUTION_AREAS_KM2,
        "description": "Area in square kilometers for each H3 resolution level"
    }


@router.get("/{project_id}/check-data")
async def check_project_grid_data(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a project has any data entries linked to grid cells.
    Use this before regenerating grids to warn users about potential data loss.
    """
    # Count responses with h3_index for this project
    count_query = select(func.count(StakeholderResponse.id)).where(
        StakeholderResponse.project_id == project_id,
        StakeholderResponse.h3_index != None
    )
    result = await db.execute(count_query)
    response_count = result.scalar() or 0
    
    # Also count total grid cells
    grid_count_query = select(func.count(ProjectGridCell.id)).where(
        ProjectGridCell.project_id == project_id
    )
    grid_result = await db.execute(grid_count_query)
    grid_count = grid_result.scalar() or 0
    
    has_data = response_count > 0
    
    return {
        "has_data": has_data,
        "response_count": response_count,
        "grid_count": grid_count,
        "warning_message": f"⚠️ DİKKAT: Bu proje için {response_count} adet grid bazlı veri girişi bulunmaktadır. Gridleri yeniden üretirseniz bu veriler silinecektir!" if has_data else None
    }

# ==================== AREA-BASED GRID GENERATION ====================

@router.post("/area/{area_id}/generate")
async def generate_grids_for_area(
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Generate grids for a specific project area using its configuration"""
    
    # Fetch area with configuration
    result = await db.execute(select(ProjectArea).where(ProjectArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area or not area.boundary_geom:
        raise HTTPException(status_code=404, detail="Alan veya sınır bulunamadı")

    min_area_km2 = area.min_cell_area_km2 or 0.0003
    max_area_km2 = area.max_cell_area_km2 or 5.0
    num_resolutions = area.num_resolutions or 8

    resolutions_to_generate = calculate_resolution_range_km2(
        min_area_km2, 
        max_area_km2, 
        num_resolutions
    )

    async def generation_process():
        # Get GeoJSON
        geo_result = await db.execute(func.ST_AsGeoJSON(area.boundary_geom))
        geojson_str = geo_result.scalar_one()
        geojson = json.loads(geojson_str)
        
        yield json.dumps({
            "status": "processing", 
            "message": f"Geometri işleniyor: {geojson['type']}", 
            "progress": 5,
            "resolutions": resolutions_to_generate,
            "min_area_km2": min_area_km2,
            "max_area_km2": max_area_km2
        }) + "\n"
        
        # Delete existing grids for this area only
        await db.execute(delete(ProjectGridCell).where(ProjectGridCell.area_id == area_id))
        await db.commit()
        
        yield json.dumps({"status": "processing", "message": "Bu alan için mevcut gridler temizlendi", "progress": 10}) + "\n"
        
        total_cells_saved = 0
        
        # Generate for each resolution
        for idx, res in enumerate(resolutions_to_generate):
            cells = generate_cells_for_resolution(geojson, res)
            
            if not cells:
                continue
            
            res_area = H3_RESOLUTION_AREAS_KM2.get(res, 0)
            progress_base = 10 + int(((idx + 1) / len(resolutions_to_generate)) * 80)
            yield json.dumps({
                "status": "processing", 
                "message": f"Çözünürlük {res} ({format_area_km2(res_area)}): {len(cells)} hücre", 
                "progress": progress_base
            }) + "\n"
            
            # Save cells in batches
            batch_size = 2000 # Increased batch size for performance
            cell_list = list(cells)
            
            # Track when to yield progress to prevent overwhelming the stream/timeout
            last_yield_time = time.time()
            yield_count = 0
            
            for i in range(0, len(cell_list), batch_size):
                batch = cell_list[i:i+batch_size]
                cell_objects = []
                
                for cell in batch:
                    if hasattr(h3, 'cell_to_boundary'):
                        boundary = h3.cell_to_boundary(cell)
                    else:
                        boundary = h3.h3_to_geo_boundary(cell)
                    
                    polygon_coords = [[b[1], b[0]] for b in boundary]
                    if polygon_coords[0] != polygon_coords[-1]:
                        polygon_coords.append(polygon_coords[0])
                    
                    wkt = f"POLYGON(({','.join([f'{c[0]} {c[1]}' for c in polygon_coords])}))"
                    cell_objects.append({
                        "project_id": area.project_id,
                        "area_id": area_id,
                        "h3_index": cell,
                        "resolution": res,
                        "geometry": WKTElement(wkt, srid=4326)
                    })
                
                await db.execute(insert(ProjectGridCell), cell_objects)
                await db.commit()
                total_cells_saved += len(batch)
                yield_count += len(batch)

                # Yield progress every 5000 cells or every 5 seconds to keep connection alive
                if yield_count >= 5000 or (time.time() - last_yield_time) > 5:
                    yield json.dumps({
                        "status": "processing", 
                        "message": f"Çözünürlük {res}: {total_cells_saved} hücre yüklendi...", 
                        "progress": progress_base
                    }) + "\n"
                    last_yield_time = time.time()
                    yield_count = 0
        
        # Mark area as having grids generated
        await db.execute(
            update(ProjectArea).where(ProjectArea.id == area_id).values(grids_generated=True)
        )
        await db.commit()
        
        yield json.dumps({
            "status": "success", 
            "message": f"{len(resolutions_to_generate)} çözünürlük için toplam {total_cells_saved} hücre oluşturuldu", 
            "count": total_cells_saved,
            "resolutions_created": resolutions_to_generate,
            "progress": 100
        }) + "\n"

    return StreamingResponse(generation_process(), media_type="application/x-ndjson")


@router.get("/area/{area_id}")
async def get_grids_for_area(
    area_id: UUID,
    resolution: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get grids for a specific area, optionally filtered by resolution"""
    # Use raw SQL to fetch rows and build JSON string manually for maximum performance/stability
    where_clauses = ["area_id = CAST(:area_id AS UUID)"]
    params = {"area_id": str(area_id)}
    if resolution is not None:
        where_clauses.append("resolution = CAST(:resolution AS INT)")
        params["resolution"] = resolution
    
    where_stmt = " AND ".join(where_clauses)
    query_text = text(f"""
        SELECT h3_index, resolution, ST_AsGeoJSON(geometry) as geojson
        FROM project_grid_cells
        WHERE {where_stmt}
    """)
    
    result = await db.execute(query_text, params)
    rows = result.all()
    
    features_list = []
    for row in rows:
        f = f'{{"type":"Feature","properties":{{"h3_index":"{row[0]}","resolution":{row[1]}}},"geometry":{row[2]}}}'
        features_list.append(f)
    
    response_json = f'{{"type":"FeatureCollection","area_id":"{area_id}","features":[{",".join(features_list)}]}}'
    return Response(content=response_json, media_type="application/json")


@router.get("/area/{area_id}/by-zoom")
async def get_area_grids_by_zoom(
    area_id: UUID, 
    zoom: int = Query(10),
    db: AsyncSession = Depends(get_db)
):
    """Get grids for an area appropriate for a given map zoom level"""
    # Get available resolutions for this area
    available_query = select(ProjectGridCell.resolution).where(
        ProjectGridCell.area_id == area_id
    ).distinct()
    available_result = await db.execute(available_query)
    available_resolutions = [row[0] for row in available_result.all()]
    
    if not available_resolutions:
        return {"resolution": None, "zoom": zoom, "features": []}
    
    target_res = get_resolution_for_zoom(zoom)
    best_res = min(available_resolutions, key=lambda x: abs(x - target_res))
    
    # Use raw SQL to fetch rows
    query_text = text("""
        SELECT h3_index, resolution, ST_AsGeoJSON(geometry) as geojson
        FROM project_grid_cells
        WHERE area_id = CAST(:area_id AS UUID) AND resolution = CAST(:best_res AS INT)
    """)
    
    result = await db.execute(query_text, {"area_id": str(area_id), "best_res": best_res})
    rows = result.all()
    
    features_list = []
    for row in rows:
        f = f'{{"type":"Feature","properties":{{"h3_index":"{row[0]}","resolution":{row[1]}}},"geometry":{row[2]}}}'
        features_list.append(f)
    
    response_json = f'{{"resolution":{best_res},"zoom":{zoom},"available_resolutions":{json.dumps(sorted(available_resolutions))},"type":"FeatureCollection","features":[{",".join(features_list)}]}}'
    return Response(content=response_json, media_type="application/json")


@router.get("/area/{area_id}/resolutions")
async def get_area_resolutions(
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get list of available resolutions for an area"""
    query = select(
        ProjectGridCell.resolution,
        func.count(ProjectGridCell.id).label("count")
    ).where(
        ProjectGridCell.area_id == area_id
    ).group_by(ProjectGridCell.resolution).order_by(ProjectGridCell.resolution)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "resolution": row.resolution, 
            "count": row.count,
            "approx_area_km2": H3_RESOLUTION_AREAS_KM2.get(row.resolution, 0)
        } for row in rows
    ]


# ==================== LEGACY PROJECT-BASED ENDPOINTS (for backward compatibility) ====================

@router.post("/{project_id}/generate-all")
async def generate_all_grids(
    project_id: UUID,
    min_cell_area_km2: float = Query(0.0003, description="En küçük grid alanı (km²)"),
    max_cell_area_km2: float = Query(5.0, description="En büyük grid alanı (km²)"),
    num_resolutions: int = Query(8, description="Çözünürlük sayısı"),
    db: AsyncSession = Depends(get_db)
):
    """Generate grids for project's main boundary (legacy - use area-based generation for new projects)"""
    
    # Fetch project with geometry
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or not project.boundary_geom:
        raise HTTPException(status_code=404, detail="Project or boundary not found")

    resolutions_to_generate = calculate_resolution_range_km2(
        min_cell_area_km2, 
        max_cell_area_km2, 
        num_resolutions
    )

    async def generation_process():
        geo_result = await db.execute(func.ST_AsGeoJSON(project.boundary_geom))
        geojson_str = geo_result.scalar_one()
        geojson = json.loads(geojson_str)
        
        yield json.dumps({
            "status": "processing", 
            "message": f"Geometri işleniyor: {geojson['type']}", 
            "progress": 5,
            "resolutions": resolutions_to_generate
        }) + "\n"
        
        # Delete existing grids for this project (only those without area_id)
        await db.execute(
            delete(ProjectGridCell).where(
                ProjectGridCell.project_id == project_id,
                ProjectGridCell.area_id == None
            )
        )
        await db.commit()
        
        yield json.dumps({"status": "processing", "message": "Mevcut gridler temizlendi", "progress": 10}) + "\n"
        
        total_cells_saved = 0
        
        for idx, res in enumerate(resolutions_to_generate):
            cells = generate_cells_for_resolution(geojson, res)
            
            if not cells:
                continue
            
            res_area = H3_RESOLUTION_AREAS_KM2.get(res, 0)
            progress_base = 10 + int(((idx + 1) / len(resolutions_to_generate)) * 80)
            yield json.dumps({
                "status": "processing", 
                "message": f"Çözünürlük {res} ({format_area_km2(res_area)}): {len(cells)} hücre", 
                "progress": progress_base
            }) + "\n"
            
            batch_size = 500
            cell_list = list(cells)
            
            for i in range(0, len(cell_list), batch_size):
                batch = cell_list[i:i+batch_size]
                cell_objects = []
                
                for cell in batch:
                    if hasattr(h3, 'cell_to_boundary'):
                        boundary = h3.cell_to_boundary(cell)
                    else:
                        boundary = h3.h3_to_geo_boundary(cell)
                    
                    polygon_coords = [[b[1], b[0]] for b in boundary]
                    if polygon_coords[0] != polygon_coords[-1]:
                        polygon_coords.append(polygon_coords[0])
                    
                    wkt = f"POLYGON(({','.join([f'{c[0]} {c[1]}' for c in polygon_coords])}))"
                    cell_objects.append({
                        "project_id": project_id,
                        "area_id": None,
                        "h3_index": cell,
                        "resolution": res,
                        "geometry": WKTElement(wkt, srid=4326)
                    })
                
                await db.execute(insert(ProjectGridCell), cell_objects)
                await db.commit()
                total_cells_saved += len(batch)
        
        yield json.dumps({
            "status": "success", 
            "message": f"{len(resolutions_to_generate)} çözünürlük için toplam {total_cells_saved} hücre oluşturuldu", 
            "count": total_cells_saved,
            "resolutions_created": resolutions_to_generate,
            "progress": 100
        }) + "\n"

    return StreamingResponse(generation_process(), media_type="application/x-ndjson")


@router.get("/{project_id}", response_model=List[dict])
async def get_project_grids(
    project_id: UUID, 
    resolution: int = Query(None, description="Filter by resolution"),
    area_id: Optional[UUID] = Query(None, description="Filter by area"),
    db: AsyncSession = Depends(get_db)
):
    """Get grids for a project, optionally filtered by resolution and area"""
    # Use raw SQL to fetch rows and build JSON string manually for maximum performance/stability
    where_clauses = ["project_id = CAST(:project_id AS UUID)"]
    params = {"project_id": str(project_id)}
    if resolution is not None:
        where_clauses.append("resolution = CAST(:resolution AS INT)")
        params["resolution"] = resolution
    if area_id is not None:
        where_clauses.append("area_id = CAST(:area_id AS UUID)")
        params["area_id"] = str(area_id)
        
    where_stmt = " AND ".join(where_clauses)
    query_text = text(f"""
        SELECT h3_index, resolution, ST_AsGeoJSON(geometry) as geojson, area_id
        FROM project_grid_cells
        WHERE {where_stmt}
    """)
    
    result = await db.execute(query_text, params)
    rows = result.all()
    
    features_list = []
    for row in rows:
        area_id_val = f'"{row[3]}"' if row[3] else 'null'
        f = f'{{"type":"Feature","properties":{{"h3_index":"{row[0]}","resolution":{row[1]},"area_id":{area_id_val}}},"geometry":{row[2]}}}'
        features_list.append(f)
    
    response_json = f'[{",".join(features_list)}]'
    return Response(content=response_json, media_type="application/json")


@router.get("/{project_id}/by-zoom")
async def get_grids_by_zoom(
    project_id: UUID, 
    zoom: int = Query(10),
    area_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get grids appropriate for a given map zoom level"""
    # Build base filter
    base_filter = ProjectGridCell.project_id == project_id
    if area_id:
        base_filter = ProjectGridCell.area_id == area_id
    
    # Get available resolutions
    available_query = select(ProjectGridCell.resolution).where(base_filter).distinct()
    available_result = await db.execute(available_query)
    available_resolutions = [row[0] for row in available_result.all()]
    
    if not available_resolutions:
        return {"resolution": None, "zoom": zoom, "features": []}
    
    target_res = get_resolution_for_zoom(zoom)
    best_res = min(available_resolutions, key=lambda x: abs(x - target_res))
    
    # Build base filter for raw SQL
    where_clauses = ["project_id = CAST(:project_id AS UUID)"]
    params = {
        "project_id": str(project_id), 
        "best_res": best_res,
        "zoom": zoom
    }
    if area_id:
        where_clauses.append("area_id = CAST(:area_id AS UUID)")
        params["area_id"] = str(area_id)
    
    where_stmt = " AND ".join(where_clauses)
    
    query_text = text(f"""
        SELECT h3_index, resolution, ST_AsGeoJSON(geometry) as geojson, area_id
        FROM project_grid_cells
        WHERE {where_stmt} AND resolution = CAST(:best_res AS INT)
    """)
    
    result = await db.execute(query_text, params)
    rows = result.all()
    
    features_list = []
    for row in rows:
        area_id_val = f'"{row[3]}"' if row[3] else 'null'
        f = f'{{"type":"Feature","properties":{{"h3_index":"{row[0]}","resolution":{row[1]},"area_id":{area_id_val}}},"geometry":{row[2]}}}'
        features_list.append(f)
    
    response_json = f'{{"resolution":{best_res},"zoom":{zoom},"available_resolutions":{json.dumps(sorted(available_resolutions))},"type":"FeatureCollection","features":[{",".join(features_list)}]}}'
    return Response(content=response_json, media_type="application/json")


@router.get("/{project_id}/resolutions")
async def get_available_resolutions(
    project_id: UUID,
    area_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get list of available resolutions for a project"""
    query = select(
        ProjectGridCell.resolution,
        func.count(ProjectGridCell.id).label("count")
    ).where(ProjectGridCell.project_id == project_id)
    
    if area_id:
        query = query.where(ProjectGridCell.area_id == area_id)
    
    query = query.group_by(ProjectGridCell.resolution).order_by(ProjectGridCell.resolution)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "resolution": row.resolution, 
            "count": row.count,
            "approx_area_km2": H3_RESOLUTION_AREAS_KM2.get(row.resolution, 0)
        } for row in rows
    ]


@router.post("/{project_id}/intersecting-cells")
async def get_intersecting_high_res_cells(
    project_id: UUID,
    selected_h3_indices: List[str],
    area_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Find highest resolution cells that intersect with selected cells."""
    if not selected_h3_indices:
        return {"cells": [], "resolution": None}
    
    # Build base query
    base_query = ProjectGridCell.project_id == project_id
    if area_id:
        base_query = ProjectGridCell.area_id == area_id
    
    # Get highest resolution
    max_res_query = select(func.max(ProjectGridCell.resolution)).where(base_query)
    max_res_result = await db.execute(max_res_query)
    max_resolution = max_res_result.scalar() or 8
    
    # Get union geometry of selected cells
    selected_query = select(
        func.ST_Union(ProjectGridCell.geometry).label("union_geom")
    ).where(
        base_query,
        ProjectGridCell.h3_index.in_(selected_h3_indices)
    )
    
    selected_result = await db.execute(selected_query)
    union_row = selected_result.first()
    
    if not union_row or not union_row.union_geom:
        return {"cells": [], "resolution": max_resolution}
    
    # Find intersecting highest-resolution cells
    intersecting_query = select(
        ProjectGridCell.h3_index,
        func.ST_AsGeoJSON(ProjectGridCell.geometry).label("geojson")
    ).where(
        base_query,
        ProjectGridCell.resolution == max_resolution,
        func.ST_Intersects(ProjectGridCell.geometry, union_row.union_geom)
    )
    
    result = await db.execute(intersecting_query)
    rows = result.all()
    
    return {
        "cells": [row.h3_index for row in rows],
        "resolution": max_resolution,
        "count": len(rows),
        "geometries": [
            {
                "type": "Feature",
                "properties": {"h3_index": row.h3_index},
                "geometry": json.loads(row.geojson)
            } for row in rows
        ]
    }
