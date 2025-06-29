from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import io
import chess
import chess.pgn
import chess.polyglot
from chess.engine import Limit
from sqlalchemy import text
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter()

class PlayerInfo(BaseModel):
    username: str
    rating: Optional[int] = None
    result: Optional[str] = None
    id: Optional[str] = None

class GameData(BaseModel):
    white: PlayerInfo
    black: PlayerInfo
    end_time: int
    time_class: str
    rated: bool
    pgn: Optional[str] = None
    url: Optional[str] = None
    fen: Optional[str] = None
    time_control: Optional[str] = None
    rules: Optional[str] = None
    eco: Optional[str] = None
    tournament: Optional[str] = None
    match: Optional[str] = None


def classify_move(cpl: int) -> str:
    if cpl <= 20:  return "Best Move"
    if cpl <= 50:  return "Excellent"
    if cpl <= 100: return "Good"
    if cpl <= 200: return "Inaccuracy"
    if cpl <= 300: return "Mistake"
    return "Blunder"


def analyse_position(wrapper: Dict[str, Any], fen: str) -> List[Dict[str, Any]]:
    board = chess.Board(fen)
    with wrapper["lock"]:
        info = wrapper["engine"].analyse(board, limit=Limit(depth=10), multipv=2)
    return info


def get_wrapper(request: Request) -> Dict[str, Any]:
    wrapper = getattr(request.app.state, "engine_wrapper", None)
    if not wrapper:
        raise HTTPException(status_code=500, detail="Engine not initialized")
    return wrapper

@router.post("/analyze-game")
async def analyze_game(
    game: GameData,
    request: Request,
    wrapper: Dict[str, Any] = Depends(get_wrapper),
    db: Session = Depends(get_db)
):
    if not game.pgn:
        raise HTTPException(status_code=400, detail="PGN data is required")

    book = getattr(request.app.state, "book", None)
    if book is None:
        raise HTTPException(status_code=500, detail="Opening book not initialized")

    try:
        pgn_stream = io.StringIO(game.pgn)
        parsed_game = chess.pgn.read_game(pgn_stream)
        if not parsed_game:
            raise HTTPException(status_code=400, detail="Unable to parse PGN.")

        # Single-pass analysis loop
        board = parsed_game.board()
        analysis_results: List[Dict[str, Any]] = []

        for move in parsed_game.mainline_moves():
            # Snapshot before move
            board_before = board.copy(stack=False)
            fen_before = board_before.fen()
            in_book = any(entry.move == move for entry in book.find_all(board_before))

            # Analyse position before the move
            analysis = analyse_position(wrapper, fen_before)
            top_eval = analysis[0]["score"].pov(chess.WHITE)
            if top_eval.is_mate():
                best_eval = 100_000 if top_eval.mate() > 0 else -100_000
                mate_in = top_eval.mate()
            else:
                best_eval = top_eval.score(mate_score=100_000) or 0
                mate_in = None
            best_move = analysis[0].get("pv", [None])[0].uci() if analysis[0].get("pv") else None

            # Push move and analyse after
            board.push(move)
            fen_after = board.fen()
            after_info = analyse_position(wrapper, fen_after)[0]
            after_eval_obj = after_info["score"].pov(chess.WHITE)
            if after_eval_obj.is_mate():
                eval_after = 100_000 if after_eval_obj.mate() > 0 else -100_000
            else:
                eval_after = after_eval_obj.score(mate_score=100_000) or 0

            # Compute centipawn loss & classification
            centipawn_loss = 0 if in_book else abs(best_eval - eval_after)
            classification = (
                "Forced Mate" if after_eval_obj.is_mate() else
                ("Book Move" if in_book else classify_move(centipawn_loss))
            )

            analysis_results.append({
                "move_number": board_before.fullmove_number,
                "player": "White" if board_before.turn else "Black",
                "move": move.uci(),
                "fen_before": fen_before,
                "fen_after": fen_after,
                "evaluation_before": best_eval,
                "evaluation_after": eval_after,
                "centipawn_loss": centipawn_loss,
                "classification": classification,
                "mate_in": mate_in,
                "best_move": best_move,
                "best_evaluation": best_eval,
                "move_flags": {
                    "is_capture": board_before.is_capture(move),
                    "is_check": board.is_check(),
                    "is_castling": board_before.is_castling(move),
                    "is_promotion": move.promotion is not None,
                },
            })
        return {"MoveAnalyses": analysis_results}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during analysis: {e}")