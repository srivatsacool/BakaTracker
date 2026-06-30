from pydantic import BaseModel

class CharacterRecord(BaseModel):
    id: str
    level: int
    total_xp: float
    discipline: float
    health: float
    knowledge: float
    creativity: float
    career: float
    title: str
    updated_at: str

class WeeklyStatsRecord(BaseModel):
    week_start: str  # YYYY-MM-DD
    xp: float
    health: float
    knowledge: float
    career: float
    creativity: float
    discipline: float
