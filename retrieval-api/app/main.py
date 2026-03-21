import logging
import traceback
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from app.config import Settings
from app.routers import healthz, retrieve

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    pool = ConnectionPool(
        settings.database_url,
        configure=lambda conn: register_vector(conn),
    )
    app.state.db_pool = pool
    yield
    pool.close()


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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    phrase = HTTPStatus(exc.status_code).phrase
    body: dict = {
        "url": str(request.url),
        "method": request.method,
        "statusCode": exc.status_code,
        "message": phrase,
        "error": exc.detail,
    }
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    body: dict = {
        "url": str(request.url),
        "method": request.method,
        "statusCode": 500,
        "message": "Internal Server Error",
        "error": "Internal Server Error",
    }
    if settings.app_environment == "development":
        body["detail"] = str(exc)
        body["stack"] = traceback.format_exception(exc)
    return JSONResponse(status_code=500, content=body)


app.include_router(retrieve.router)
app.include_router(healthz.router)
