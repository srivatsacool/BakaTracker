from pydantic import BaseModel

class Quote(BaseModel):
    id: str
    quote: str
    author: str
    category: str
    active: bool
