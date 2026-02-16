from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    boundary_geom: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = {}

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: UUID
    admin_id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

    @field_validator('boundary_geom', mode='before')
    @classmethod
    def validate_geometry(cls, v):
        if v is None:
            return None
        from geoalchemy2.elements import WKBElement
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping
        if isinstance(v, WKBElement):
            return mapping(to_shape(v))
        return v

class GridConfig(BaseModel):
    zoom_level: int
    h3_resolution: int

class ProjectColumnBase(BaseModel):
    name: str
    label: str
    type: str # text, number, select, rating, geometry
    is_required: bool = False
    options: List[Dict[str, Any]] = []
    config: Optional[Dict[str, Any]] = {}

class ProjectColumnCreate(ProjectColumnBase):
    project_id: UUID

class ProjectColumnUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    type: Optional[str] = None
    is_required: Optional[bool] = None
    options: Optional[List[Dict[str, Any]]] = None
    config: Optional[Dict[str, Any]] = None

class ProjectColumn(ProjectColumnBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class StakeholderFormBase(BaseModel):
    name: str
    selected_columns: List[UUID]

class StakeholderFormCreate(StakeholderFormBase):
    project_id: UUID

class StakeholderForm(StakeholderFormBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class FormAssignmentBase(BaseModel):
    form_id: UUID
    user_id: int
    project_id: UUID

class FormAssignmentCreate(FormAssignmentBase):
    pass

class FormAssignment(FormAssignmentBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class FormSchemaBase(BaseModel):
    schema_json: Dict[str, Any]

class FormSchemaCreate(FormSchemaBase):
    project_id: UUID

class FormSchema(FormSchemaBase):
    id: UUID
    project_id: UUID
    created_at: datetime

class ResponseCreate(BaseModel):
    project_id: UUID
    h3_index: Optional[str] = None
    response_data: Dict[str, Any]

class Response(ResponseCreate):
    id: UUID
    user_id: int
    created_at: datetime
    geom: Optional[Dict[str, Any]] = None

    model_config = {
        "from_attributes": True
    }

    @field_validator('geom', mode='before')
    @classmethod
    def validate_geometry(cls, v):
        if v is None:
            return None
        from geoalchemy2.elements import WKBElement
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping
        if isinstance(v, WKBElement):
            return mapping(to_shape(v))
        return v
