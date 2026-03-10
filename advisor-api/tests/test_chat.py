from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


@patch("app.routers.chat.generate_answer", return_value="Use system node pools for reliability.")
@patch("app.routers.chat.retrieve", return_value=[
    {
        "title": "Node Pools Guide",
        "url": "https://learn.microsoft.com/aks/node-pools",
        "score": 0.92,
        "text": "System node pools run critical add-ons...",
        "tags": {"doc_type": "guide"},
        "priority": 10,
    }
])
@patch("app.routers.chat.reformulate_query", return_value="AKS node pool configuration best practices")
class TestChatEndpoint:
    def setup_method(self):
        app.state.qdrant = MagicMock()
        self.client = TestClient(app)

    def test_returns_answer_and_sources(self, mock_reform, mock_retrieve, mock_llm):
        response = self.client.post("/api/chat", json={"question": "How to set up node pools?"})
        assert response.status_code == 200

        data = response.json()
        assert data["answer"] == "Use system node pools for reliability."
        assert data["reformulated_query"] == "AKS node pool configuration best practices"
        assert len(data["sources"]) == 1
        assert data["sources"][0]["title"] == "Node Pools Guide"
        assert data["sources"][0]["score"] == 0.92

    def test_rejects_missing_question(self, mock_reform, mock_retrieve, mock_llm):
        response = self.client.post("/api/chat", json={})
        assert response.status_code == 422


@patch("app.routers.healthz.ollama")
class TestHealthEndpoint:
    def setup_method(self):
        app.state.qdrant = MagicMock()
        self.client = TestClient(app)

    def test_healthy(self, mock_ollama):
        response = self.client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "advisor-api"
        assert data["version"] == "0.1.0"
        assert data["status"] == "pass"
        assert data["checks"]["qdrant"] == "pass"
        assert data["checks"]["ollama"] == "pass"
        assert "uptime" in data
        assert data["uptime"]["component_type"] == "system"
        assert data["uptime"]["observed_unit"] == "s"
        assert data["uptime"]["observed_value"] >= 0

    def test_degraded_when_ollama_down(self, mock_ollama):
        mock_ollama.list.side_effect = Exception("connection refused")
        response = self.client.get("/healthz")
        data = response.json()
        assert data["status"] == "fail"
        assert data["checks"]["ollama"].startswith("fail:")
