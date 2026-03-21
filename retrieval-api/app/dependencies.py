from functools import lru_cache

from fastapi import Request
from psycopg import Connection

from app.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_db(request: Request) -> Connection:
    pool = request.app.state.db_pool
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)
