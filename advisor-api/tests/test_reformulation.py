from unittest.mock import patch

from app.services.reformulation import reformulate_query


class TestReformulateQuery:
    @patch("app.services.reformulation.ollama")
    def test_returns_reformulated_query(self, mock_ollama):
        mock_ollama.chat.return_value = {
            "message": {"content": "AKS cluster network policies configuration"}
        }
        result = reformulate_query("how do I secure my cluster?", "llama3.2")
        assert result == "AKS cluster network policies configuration"

    @patch("app.services.reformulation.ollama")
    def test_falls_back_on_error(self, mock_ollama):
        mock_ollama.chat.side_effect = Exception("connection refused")
        result = reformulate_query("my original question", "llama3.2")
        assert result == "my original question"
