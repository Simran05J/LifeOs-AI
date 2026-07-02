from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="The title of the task")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed instructions or details of the task")
    due_date: Optional[datetime] = Field(None, description="The date and time by which the task should be finished")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task execution priority")
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Current workflow state of the task")
    tags: List[str] = Field(default_factory=list, description="Categorization tags associated with this task")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None

class TaskResponse(TaskBase):
    id: str = Field(..., description="Unique task document identifier")
    user_id: str = Field(..., description="Owner User ID (UID)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    class Config:
        from_attributes = True
        use_enum_values = True
