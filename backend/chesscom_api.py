import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import httpx

router = APIRouter()
logger = logging.getLogger("chesscom_api")
logger.setLevel(logging.INFO)


class UsernameRequest(BaseModel):
    username: str


@router.post("/fetch-games")
async def fetch_chess_games(req: UsernameRequest):
    username = req.username.strip().lower()
    logger.info(f"→ fetch_games called for '{username}'")

    archives_url = f"https://api.chess.com/pub/player/{username}/games/archives"
    headers = {"User-Agent": "GameReview/1.0"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1) GET the list of archives (follow any HTTP→HTTPS redirects)
            archives_resp = await client.get(
                archives_url, headers=headers, follow_redirects=True
            )
            archives_resp.raise_for_status()
            archives = archives_resp.json().get("archives", [])
            if not archives:
                logger.info(f"No archives found for '{username}'")
                return {"games": []}

            # 2) GET the latest archive
            latest = archives[-1]
            games_resp = await client.get(
                latest, headers=headers, follow_redirects=True
            )
            games_resp.raise_for_status()
            games = games_resp.json().get("games", [])

        logger.info(f"← returning {len(games)} games for '{username}'")
        return {"games": games}

    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        detail = exc.response.json().get("message", exc.response.text)
        logger.error(f"HTTP error {code} fetching for '{username}': {detail}")
        if code == 404:
            raise HTTPException(
                status_code=404, detail=f"Chess.com user '{username}' not found"
            )
        raise HTTPException(status_code=code, detail=detail)

    except httpx.RequestError as exc:
        logger.error(f"Network error fetching for '{username}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Network error contacting Chess.com",
        )
