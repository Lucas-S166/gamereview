import os
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles

import chess.polyglot
from chess.engine import SimpleEngine, EngineTerminatedError

from chesscom_api import router as chess_router
from analysis import router as analysis_router

BASE_DIR = Path(__file__).resolve().parent          # …/backend
PROJECT_ROOT = BASE_DIR.parent                      # …/
ENGINE_PATH = BASE_DIR / "Stockfish" / "src" / "stockfish"
BOOK_PATH   = BASE_DIR / "Perfect_2023" / "BIN" / "Perfect2023.bin"

FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Launch Stockfish
    engine = SimpleEngine.popen_uci(str(ENGINE_PATH))
    psutil.Process(engine.transport._proc.pid).nice(19)
    engine.configure({"Threads": 16, "Hash": 4096})

    # Shared objects
    app.state.engine_wrapper = {"engine": engine, "lock": threading.Lock()}
    app.state.executor = ThreadPoolExecutor(max_workers=4)
    app.state.book = chess.polyglot.open_reader(str(BOOK_PATH))

    yield

    # Graceful shutdown
    try:
        app.state.engine_wrapper["engine"].quit()
    except EngineTerminatedError:
        print("Engine already terminated.")

    app.state.executor.shutdown(wait=False)
    app.state.book.close()

app = FastAPI(
    title="GameReview API",
    version="1.0.0",
    description="Endpoints for fetching and analyzing Chess.com games",
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chess_router,    prefix="/api")
app.include_router(analysis_router, prefix="/api")

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
else:
    print(f"[WARN] Front-end bundle not found at {FRONTEND_DIST}. "
          "Run `npm run build` in the frontend directory.")