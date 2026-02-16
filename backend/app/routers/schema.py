from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.models.project import ProjectColumn as ProjectColumnModel, StakeholderForm as StakeholderFormModel, FormAssignment as FormAssignmentModel
from app.schemas.project import ProjectColumn, ProjectColumnCreate, ProjectColumnUpdate, StakeholderForm, StakeholderFormCreate, FormAssignment, FormAssignmentCreate
from uuid import UUID

router = APIRouter(prefix="/schema", tags=["schema"])

# --- Project Columns ---

@router.get("/columns/{project_id}", response_model=List[ProjectColumn])
async def get_columns(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectColumnModel).where(ProjectColumnModel.project_id == project_id))
    return result.scalars().all()

@router.post("/columns/", response_model=ProjectColumn)
async def create_column(column: ProjectColumnCreate, db: AsyncSession = Depends(get_db)):
    new_col = ProjectColumnModel(**column.dict())
    db.add(new_col)
    await db.commit()
    await db.refresh(new_col)
    return new_col

@router.patch("/columns/{column_id}", response_model=ProjectColumn)
async def update_column(column_id: UUID, schema: ProjectColumnUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectColumnModel).where(ProjectColumnModel.id == column_id))
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    
    update_data = schema.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(col, key, value)
    
    await db.commit()
    await db.refresh(col)
    return col

@router.delete("/columns/{column_id}")
async def delete_column(column_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectColumnModel).where(ProjectColumnModel.id == column_id))
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    await db.delete(col)
    await db.commit()
    return {"message": "Column deleted"}

# --- Stakeholder Forms ---

@router.get("/forms/{project_id}", response_model=List[StakeholderForm])
async def get_stakeholder_forms(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StakeholderFormModel).where(StakeholderFormModel.project_id == project_id))
    return result.scalars().all()

@router.post("/forms/", response_model=StakeholderForm)
async def create_stakeholder_form(form: StakeholderFormCreate, db: AsyncSession = Depends(get_db)):
    # Convert list of UUIDs to list of strings for JSONB storage
    data = form.dict()
    data['selected_columns'] = [str(c) for c in form.selected_columns]
    new_form = StakeholderFormModel(**data)
    db.add(new_form)
    await db.commit()
    await db.refresh(new_form)
    return new_form

@router.patch("/forms/{form_id}", response_model=StakeholderForm)
async def update_stakeholder_form(form_id: UUID, schema: StakeholderFormCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StakeholderFormModel).where(StakeholderFormModel.id == form_id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    form.name = schema.name
    # Ensure they are stored as strings in JSONB
    form.selected_columns = [str(c) for c in schema.selected_columns]
    
    await db.commit()
    await db.refresh(form)
    return form

@router.delete("/forms/{form_id}")
async def delete_stakeholder_form(form_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StakeholderFormModel).where(StakeholderFormModel.id == form_id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    await db.delete(form)
    await db.commit()
    return {"message": "Form deleted"}

@router.get("/form/{form_id}")
async def get_form_details(form_id: UUID, db: AsyncSession = Depends(get_db)):
    # Fetch form
    result = await db.execute(select(StakeholderFormModel).where(StakeholderFormModel.id == form_id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Fetch its columns
    col_query = select(ProjectColumnModel).where(ProjectColumnModel.id.in_(form.selected_columns))
    col_result = await db.execute(col_query)
    columns = col_result.scalars().all()
    
    return {
        "id": str(form.id),
        "name": form.name,
        "project_id": str(form.project_id),
        "columns": columns
    }

# --- Form Assignments ---

@router.get("/assignments/{project_id}", response_model=List[FormAssignment])
async def get_assignments(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FormAssignmentModel).where(FormAssignmentModel.project_id == project_id))
    return result.scalars().all()

@router.post("/assignments/", response_model=FormAssignment)
async def create_assignment(assignment: FormAssignmentCreate, db: AsyncSession = Depends(get_db)):
    # Upsert logic (one form per user per project)
    from sqlalchemy import delete
    await db.execute(delete(FormAssignmentModel).where(
        FormAssignmentModel.project_id == assignment.project_id,
        FormAssignmentModel.user_id == assignment.user_id
    ))
    
    new_assignment = FormAssignmentModel(**assignment.dict())
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return new_assignment

@router.get("/user/assignments/{user_id}")
async def get_user_assignments(user_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.project import Project as ProjectModel
    # Join with Projects to get project names
    query = select(FormAssignmentModel, ProjectModel).join(
        ProjectModel, FormAssignmentModel.project_id == ProjectModel.id
    ).where(FormAssignmentModel.user_id == user_id)
    
    result = await db.execute(query)
    data = []
    for assign, proj in result.all():
        data.append({
            "id": str(assign.id),
            "project_id": str(assign.project_id),
            "project_name": proj.name,
            "project_description": proj.description,
            "form_id": str(assign.form_id)
        })
    return data
