"""Temporal Client connection, shared by the worker and starter.

Local dev connects to the CLI dev server with no auth. When TEMPORAL_API_KEY is
set (Temporal Cloud), TLS auto-enables and the key is sent as API-key auth — no
mTLS cert files to manage. Workflow/activity code is unchanged either way; only
the Client connection differs between local and Cloud.
"""

from temporalio.client import Client

from config import config as cfg


async def connect_client() -> Client:
    """Connect to Temporal (local dev server, or Cloud when an API key is set).

    Returns:
        A connected Temporal Client on the configured namespace.
    """
    connect_kwargs = {"namespace": cfg.temporal_namespace}
    if cfg.temporal_api_key:
        connect_kwargs["api_key"] = cfg.temporal_api_key
        connect_kwargs["tls"] = True
    return await Client.connect(cfg.temporal_address, **connect_kwargs)
