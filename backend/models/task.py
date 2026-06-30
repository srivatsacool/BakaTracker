from pydantic import BaseModel
from typing import Literal

TaskStatus = Literal['backlog', 'todo', 'doing', 'done']
TaskArea = Literal['health', 'career', 'learning', 'personal', 'creativity']

class Task(BaseModel):
    id: str
    title: str
    notes: str
    area: TaskArea
    status: TaskStatus
    today: bool
    due_date: str  # YYYY-MM-DD or empty
    xp: int
    created_at: str
    updated_at: str
    completed_at: str  # ISO date or empty
