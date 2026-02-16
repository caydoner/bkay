import math
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/grids/mvt", tags=["mvt"])

# Zoom to H3 Resolution mapping
ZOOM_TO_H3_RESOLUTION = {
    5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 12,
    15: 12, 16: 13, 17: 13, 18: 14, 19: 14, 20: 15
}

def get_tile_bbox_3857(z: int, x: int, y: int):
    """Calculate the bounding box of a tile in EPSG:3857"""
    world_size = 40075016.68557849
    tile_size = world_size / math.pow(2, z)
    
    x_min = -20037508.342789244 + x * tile_size
    y_max = 20037508.342789244 - y * tile_size
    x_max = x_min + tile_size
    y_min = y_max - tile_size
    
    return x_min, y_min, x_max, y_max

@router.get("/{project_id}/{z}/{x}/{y}.pbf")
async def get_tile(
    project_id: UUID,
    z: int,
    x: int,
    y: int,
    area_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a Vector Tile (MVT) for the given project, zoom, and tile coordinates.
    """
    # 1. Determine target H3 resolution based on zoom
    target_res = ZOOM_TO_H3_RESOLUTION.get(z, 8)
    
    # 2. Find BEST AVAILABLE resolution in the database for this project
    try:
        res_query = text("""
            SELECT resolution FROM project_grid_cells 
            WHERE project_id = :project_id 
            GROUP BY resolution
        """)
        res_result = await db.execute(res_query, {"project_id": project_id})
        available_resolutions = [row[0] for row in res_result.all()]
        
        if not available_resolutions:
            return Response(status_code=204) # No data for this project
            
        # Pick the closest resolution to target
        res = min(available_resolutions, key=lambda r: abs(r - target_res))
    except Exception as e:
        print(f"MVT Resolution fallback error: {e}")
        res = target_res

    # 3. Get tile bounding box in 3857
    x_min, y_min, x_max, y_max = get_tile_bbox_3857(z, x, y)
    
    # 4. Query PostgreSQL for MVT data
    where_clauses = [
        "project_id = :project_id",
        "resolution = :res",
        "geometry && ST_Transform(ST_MakeEnvelope(:x_min, :y_min, :x_max, :y_max, 3857), 4326)"
    ]
    params = {
        "project_id": project_id,
        "res": res,
        "x_min": x_min,
        "y_min": y_min,
        "x_max": x_max,
        "y_max": y_max
    }
    
    if area_id:
        where_clauses.append("area_id = :area_id")
        params["area_id"] = area_id

    where_stmt = " AND ".join(where_clauses)
    
    query_text = text(f"""
        SELECT ST_AsMVT(tile, 'h3-layer') FROM (
            SELECT 
                h3_index,
                CASE WHEN area_id IS NOT NULL THEN CAST(area_id AS TEXT) ELSE NULL END as area_id,
                ST_AsMVTGeom(
                    ST_Transform(geometry, 3857),
                    ST_MakeEnvelope(:x_min, :y_min, :x_max, :y_max, 3857),
                    4096, 64, true
                ) AS geom
            FROM project_grid_cells
            WHERE {where_stmt}
        ) AS tile;
    """)
    
    try:
        result = await db.execute(query_text, params)
        mvt_binary = result.scalar()
        
        if not mvt_binary:
            return Response(status_code=204) 
            
        return Response(
            content=mvt_binary,
            media_type="application/x-protobuf",
            headers={
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        print(f"MVT Error at {z}/{x}/{y}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
