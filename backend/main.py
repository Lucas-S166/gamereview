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
    import multiprocessing
    import psutil

    # ----------- STARTUP ------------
    total_cpus = multiprocessing.cpu_count()  # includes hyperthreads
    physical_cores = psutil.cpu_count(logical=False) or (total_cpus // 2)

    # Choose number of threads carefully
    engine_threads = physical_cores  # Prefer physical cores only
    executor_workers = min(8, engine_threads // 2)  # 4-8 analysis jobs in parallel is reasonable

    # Memory tuning
    mem = psutil.virtual_memory()
    available_gb = mem.available / (1024 ** 3)  # convert bytes to GB
    # Allocate 25% of available RAM to Stockfish Hash
    sf_hash_mb = int((available_gb * 0.25) * 1024)
    # Clip it to reasonable sizes
    sf_hash_mb = max(512, min(sf_hash_mb, 8192))  # between 512 MB and 8192 MB

    engine = SimpleEngine.popen_uci(ENGINE_PATH)
    psutil.Process(engine.transport._proc.pid).nice(19)
    engine.configure({
        "Threads": engine_threads,
        "Hash": sf_hash_mb,
    })

    app.state.engine_wrapper = {
        "engine": engine,
        "lock": threading.Lock()
    }
    app.state.executor = ThreadPoolExecutor(max_workers=executor_workers)
    app.state.book = chess.polyglot.open_reader(BOOK_PATH)

    yield  # 👇 stays here until shutdown

    # ----------- SHUTDOWN ------------
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

# Create the FastAPI app and use lifespan
app = FastAPI(
    title="GameReview API",
    version="1.0.0",
    description="Endpoints for fetching and analyzing Chess.com games",
    lifespan=lifespan,
    default_response_class=ORJSONResponse
)

# CORS
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