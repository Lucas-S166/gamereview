from pydantic import BaseModel
from typing import Any, List

class UsernameRequest(BaseModel):
    username: str
class GamesResponse(BaseModel):
    games: List[Any]