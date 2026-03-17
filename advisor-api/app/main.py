import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from qdrant_client import QdrantClient

from app.config import Settings
from app.routers import chat, healthz

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    app.state.qdrant = QdrantClient(url=settings.qdrant_url)
    yield
    app.state.qdrant.close()


settings = Settings()

app = FastAPI(
    title="AKS Architect",
    lifespan=lifespan,
    docs_url="/docs" if settings.openapi_docs_enabled else None,
    redoc_url="/redoc" if settings.openapi_docs_enabled else None,
    openapi_url="/openapi.json" if settings.openapi_docs_enabled else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    body: dict = {
        "error": "Internal Server Error",
        "statusCode": 500,
        "method": request.method,
        "url": str(request.url),
    }
    if settings.app_environment == "development":
        body["detail"] = str(exc)
        body["stack"] = traceback.format_exception(exc)
    return JSONResponse(status_code=500, content=body)


app.include_router(chat.router)
app.include_router(healthz.router)
