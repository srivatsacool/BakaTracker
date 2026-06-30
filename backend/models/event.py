from pydantic import BaseModel
from typing import Optional, Literal

EventType = Literal['habit_completed', 'task_completed', 'journal_created']
EventSource = Literal['habit', 'task', 'journal', 'system']

class EventLog(BaseModel):
    id: str
    type: EventType
    source: EventSource
    entity: str
    entity_id: str
    xp: float
    stat: str  # discipline, health, knowledge, creativity, career, general
    metadata: Optional[str] = ""  # Serialized JSON string
    timestamp: str
