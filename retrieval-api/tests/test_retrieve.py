from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


@patch(
    "app.routers.retrieve.retrieve",
    return_value=[
        {
            "id": "abc-123",
            "title": "Node Pools Guide",
            "url": "https://learn.microsoft.com/aks/node-pools",
            "score": 0.92,
            "boosted_score": 1.13,
            "text": "System node pools run critical add-ons...",
            "tags": {"doc_type": "guide"},
            "priority": 10,
        }
    ],
)
@patch("app.routers.retrieve.reformulate_query", return_value="AKS node pool configuration best practices")
class TestRetrieveEndpoint:
    def setup_method(self):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_pool.getconn.return_value = mock_conn
        app.state.db_pool = mock_pool
        self.client = TestClient(app)

    def test_returns_chunks_and_reformulated_query(self, mock_reform, mock_retrieve):
        response = self.client.post("/api/retrieve", json={"question": "How to set up node pools?"})
        assert response.status_code == 200

        data = response.json()
        assert data["reformulated_query"] == "AKS node pool configuration best practices"
        assert len(data["chunks"]) == 1

        chunk = data["chunks"][0]
        assert chunk["title"] == "Node Pools Guide"
        assert chunk["score"] == 0.92
        assert chunk["text"] == "System node pools run critical add-ons..."
        assert chunk["tags"] == {"doc_type": "guide"}
        assert chunk["priority"] == 10

    def test_returns_full_text_not_truncated(self, mock_reform, mock_retrieve):
        long_text = "A" * 500
        mock_retrieve.return_value = [
            {
                "id": "def-456",
                "title": "Long Doc",
                "url": "https://example.com",
                "score": 0.8,
                "boosted_score": 0.8,
                "text": long_text,
                "tags": {},
                "priority": None,
            }
        ]
        response = self.client.post("/api/retrieve", json={"question": "test"})
        assert response.json()["chunks"][0]["text"] == long_text

    def test_passes_history_to_reformulate(self, mock_reform, mock_retrieve):
        history = [
            {"role": "user", "content": "How to configure networking?"},
            {"role": "assistant", "content": "For AKS networking..."},
        ]
        response = self.client.post(
            "/api/retrieve",
            json={"question": "What about multi-region?", "history": history},
        )
        assert response.status_code == 200
        mock_reform.assert_called_once_with("What about multi-region?", mock_reform.call_args[0][1], history, 0.1)

    def test_rejects_missing_question(self, mock_reform, mock_retrieve):
        response = self.client.post("/api/retrieve", json={})
        assert response.status_code == 422


@patch("app.routers.healthz.ollama")
class TestHealthEndpoint:
    def setup_method(self):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (42,)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_pool.getconn.return_value = mock_conn
        app.state.db_pool = mock_pool
        self.client = TestClient(app)

    def test_healthy(self, mock_ollama):
        response = self.client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "retrieval-api"
        assert data["version"] == "0.1.0"
        assert data["status"] == "pass"
        assert data["checks"]["postgres"]["status"] == "pass"
        assert data["checks"]["postgres"]["chunk_count"] == 42
        assert data["checks"]["ollama"]["status"] == "pass"
        assert "uptime" in data
        assert data["uptime"]["component_type"] == "system"
        assert data["uptime"]["observed_unit"] == "s"
        assert data["uptime"]["observed_value"] >= 0
        assert "env" in data
        assert "APP_ENVIRONMENT" in data["env"]

    def test_degraded_when_db_fails(self, mock_ollama):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("connection refused")
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_pool.getconn.return_value = mock_conn
        app.state.db_pool = mock_pool

        response = self.client.get("/healthz")
        data = response.json()
        assert data["status"] == "fail"
        assert data["checks"]["postgres"]["status"] == "fail"
        assert "output" in data["checks"]["postgres"]

    def test_degraded_when_ollama_down(self, mock_ollama):
        mock_ollama.list.side_effect = Exception("connection refused")
        response = self.client.get("/healthz")
        data = response.json()
        assert data["status"] == "fail"
        assert data["checks"]["ollama"]["status"] == "fail"
        assert "output" in data["checks"]["ollama"]
