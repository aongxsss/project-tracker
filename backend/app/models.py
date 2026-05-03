from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ConfigItem(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')


class ProjectBase(BaseModel):
    brand: str = Field(min_length=1, max_length=50)
    pm: str = Field(min_length=1)
    name: str = Field(min_length=1)
    due_date: date
    status: str = Field(min_length=1, max_length=50)
    comment: str = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class Project(ProjectBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
