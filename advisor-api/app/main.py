from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient

from app.config import Settings
from app.routers import chat, healthz


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

app.include_router(chat.router)
app.include_router(healthz.router)
