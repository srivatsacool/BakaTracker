from pydantic import BaseModel, Field
from typing import Union, Literal

HabitType = Literal['checkbox', 'counter', 'mood', 'energy', 'numeric']
StatType = Literal['discipline', 'health', 'knowledge', 'creativity', 'career']

class Habit(BaseModel):
    id: str
    name: str
    type: HabitType
    icon: str
    xp: int
    stat: StatType
    active: bool
    created_at: str
    updated_at: str

class HabitLog(BaseModel):
    id: str
    date: str
    habit_id: str
    value: Union[int, float, str]
    xp_earned: float
    created_at: str
