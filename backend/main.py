import os
import psutil
import multiprocessing
import threading
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

import chess.polyglot
from chess.engine import SimpleEngine, EngineTerminatedError

from chesscom_api import router as chess_router
from analysis import router as analysis_router

# Paths
BASE = os.path.dirname(__file__)
ENGINE_PATH = os.path.join(BASE, "Stockfish", "src", "stockfish")
BOOK_PATH   = os.path.join(BASE, "Perfect_2023", "BIN", "Perfect2023.bin")

@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = SimpleEngine.popen_uci(ENGINE_PATH)
    psutil.Process(engine.transport._proc.pid).nice(19)
    engine.configure({
        "Threads": 16,
        "Hash": 4096,
    })

    app.state.engine_wrapper = {
        "engine": engine,
        "lock": threading.Lock()
    }
    app.state.executor = ThreadPoolExecutor(max_workers=4)
    app.state.book = chess.polyglot.open_reader(BOOK_PATH)

    yield  
    wrapper = getattr(app.state, "engine_wrapper", None)
    if wrapper:
        try:
            wrapper["engine"].quit()
        except EngineTerminatedError:
            print("Engine already terminated. No need to quit.")

    executor = getattr(app.state, "executor", None)
    if executor:
        executor.shutdown(wait=False)

    book = getattr(app.state, "book", None)
    if book:
        book.close()
app = FastAPI(
    title="GameReview API",
    version="1.0.0",
    description="Endpoints for fetching and analyzing Chess.com games",
    lifespan=lifespan,
    default_response_class=ORJSONResponse
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chess_router)
app.include_router(analysis_router)