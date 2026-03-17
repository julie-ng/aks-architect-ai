from unittest.mock import patch

from app.services.reformulation import reformulate_query


class TestReformulateQuery:
    @patch("app.services.reformulation.ollama")
    def test_returns_reformulated_query(self, mock_ollama):
        mock_ollama.chat.return_value = {"message": {"content": "AKS cluster network policies configuration"}}
        result = reformulate_query("how do I secure my cluster?", "llama3.2")
        assert result == "AKS cluster network policies configuration"

    @patch("app.services.reformulation.ollama")
    def test_includes_history_in_messages(self, mock_ollama):
        mock_ollama.chat.return_value = {"message": {"content": "AKS networking for multi-region deployments"}}
        history = [
            {"role": "user", "content": "How should I configure networking for AKS?"},
            {"role": "assistant", "content": "For AKS networking, consider CNI overlay..."},
        ]
        result = reformulate_query("What about multi-region?", "llama3.2", history)

        assert result == "AKS networking for multi-region deployments"
        call_messages = mock_ollama.chat.call_args[1]["messages"]
        assert call_messages[0]["role"] == "system"
        assert call_messages[1] == history[0]
        assert call_messages[2] == history[1]
        assert call_messages[3] == {"role": "user", "content": "What about multi-region?"}

    @patch("app.services.reformulation.ollama")
    def test_works_without_history(self, mock_ollama):
        mock_ollama.chat.return_value = {"message": {"content": "AKS cluster security"}}
        result = reformulate_query("how do I secure my cluster?", "llama3.2")

        assert result == "AKS cluster security"
        call_messages = mock_ollama.chat.call_args[1]["messages"]
        assert len(call_messages) == 2
        assert call_messages[0]["role"] == "system"
        assert call_messages[1] == {"role": "user", "content": "how do I secure my cluster?"}

    @patch("app.services.reformulation.ollama")
    def test_falls_back_on_error(self, mock_ollama):
        mock_ollama.chat.side_effect = Exception("connection refused")
        result = reformulate_query("my original question", "llama3.2")
        assert result == "my original question"
