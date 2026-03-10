from functools import lru_cache

from fastapi import Request

from app.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_qdrant(request: Request):
    return request.app.state.qdrant
