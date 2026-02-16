import h3
from typing import List, Dict, Any
import json
from shapely.geometry import shape, mapping, Polygon

def get_h3_indices_for_polygon(geojson_polygon: Dict[str, Any], resolution: int) -> List[str]:
    """
    Returns a list of H3 indices that cover the given GeoJSON polygon.
    """
    poly = shape(geojson_polygon)
    
    # Handle both Polygon and MultiPolygon
    if poly.geom_type == 'MultiPolygon':
        indices = []
        for p in poly.geoms:
            indices.extend(h3.polyfill(mapping(p), resolution, geo_json_mode=True))
        return list(set(indices))
    
    return list(h3.polyfill(geojson_polygon, resolution, geo_json_mode=True))

def h3_to_geojson(h3_index: str) -> Dict[str, Any]:
    """
    Converts an H3 index to a GeoJSON Polygon.
    """
    coords = h3.h3_to_geo_boundary(h3_index, geo_json=True)
    return {
        "type": "Polygon",
        "coordinates": [coords]
    }
