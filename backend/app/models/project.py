from sqlalchemy import Column, String, Integer, JSON, ForeignKey, DateTime, MetaData, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name = Column(String, nullable=False)
    description = Column(String)
    boundary_geom = Column(Geometry('GEOMETRY', srid=4326))  # Legacy - will migrate to areas
    config = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    admin_id = Column(Integer, ForeignKey("users.id"))


class ProjectArea(Base):
    """Represents a distinct geographic area within a project"""
    __tablename__ = "project_areas"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    description = Column(String)
    boundary_geom = Column(Geometry('GEOMETRY', srid=4326))
    # Grid configuration for this area (in km²)
    min_cell_area_km2 = Column(Float, default=0.0003)  # ~300 m² = 0.0003 km²
    max_cell_area_km2 = Column(Float, default=5.0)     # 5 km²
    num_resolutions = Column(Integer, default=8)
    grids_generated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GridConfig(Base):
    __tablename__ = "grid_configs"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    zoom_level = Column(Integer, nullable=False)
    h3_resolution = Column(Integer, nullable=False)

class ProjectColumn(Base):
    __tablename__ = "project_columns"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    label = Column(String, nullable=False)
    type = Column(String, nullable=False) # text, number, select, rating, geometry
    is_required = Column(Boolean, default=False)
    options = Column(JSONB, default=[]) # For select types
    config = Column(JSONB, default={}) # For extra metadata (geometry_type, file_types, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StakeholderForm(Base):
    __tablename__ = "stakeholder_forms"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    selected_columns = Column(JSONB, nullable=False) # Array of column IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FormAssignment(Base):
    __tablename__ = "form_assignments"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    form_id = Column(UUID(as_uuid=True), ForeignKey("stakeholder_forms.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProjectGridCell(Base):
    __tablename__ = "project_grid_cells"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    area_id = Column(UUID(as_uuid=True), ForeignKey("project_areas.id", ondelete="CASCADE"), nullable=True)  # New: link to specific area
    h3_index = Column(String, nullable=False)
    resolution = Column(Integer, nullable=False, default=8)  # H3 resolution level
    geometry = Column(Geometry('POLYGON', srid=4326))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FormSchema(Base): # Legacy, keeping for compatibility for now
    __tablename__ = "form_schemas"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    schema_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StakeholderResponse(Base):
    __tablename__ = "stakeholder_responses"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    area_id = Column(UUID(as_uuid=True), ForeignKey("project_areas.id", ondelete="SET NULL"), nullable=True)  # New: link to specific area
    user_id = Column(Integer, ForeignKey("users.id"))
    h3_index = Column(String, nullable=True)
    response_data = Column(JSONB, nullable=False)
    geom = Column(Geometry('GEOMETRY', srid=4326))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
