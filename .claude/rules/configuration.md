# Configuration

Never hardcode configuration values. Use this pattern:

```
.env  →  config object  →  application code
              ↑
         sets defaults
```

- **Config object** reads env vars, falls back to defaults
  - Use built-in config when available: `nuxt.config.ts`, pydantic-settings
  - Otherwise, write a simple `config` module (see `rag-pipeline/config.py`)
- **`.env`** defines shared values; `.env.sample` mirrors it (with empty or super generic defaults) for git
- **`docker-compose.dev.yaml`** uses `${VAR}` interpolation from `.env`
  - Only set vars here if they depend on compose context (e.g. `QDRANT_URL: http://qdrant:6333`)
