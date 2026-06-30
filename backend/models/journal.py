from pydantic import BaseModel
from typing import Literal

class JournalEntry(BaseModel):
    id: str
    date: str  # YYYY-MM-DD
    highlight: str
    notes: str
    mood: str  # 😞, 😐, 🙂, or empty
    quote_id: str
    created_at: str
    updated_at: str
