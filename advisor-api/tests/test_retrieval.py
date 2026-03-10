from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.retrieval import embed_query, retrieve, search_chunks


def _make_point(score, payload):
    point = MagicMock()
    point.score = score
    point.payload = payload
    return point


class TestEmbedQuery:
    @patch("app.services.retrieval.ollama")
    def test_returns_embedding(self, mock_ollama):
        mock_ollama.embeddings.return_value = {"embedding": [0.1, 0.2, 0.3]}
        result = embed_query("test question", "nomic-embed-text", "search_query: ")
        assert result == [0.1, 0.2, 0.3]
        mock_ollama.embeddings.assert_called_once_with(
            model="nomic-embed-text", prompt="search_query: test question"
        )


class TestSearchChunks:
    def test_returns_points(self):
        client = MagicMock()
        points = [_make_point(0.9, {"text": "hello"})]
        client.query_points.return_value = MagicMock(points=points)

        result = search_chunks(client, [0.1, 0.2], "aks-docs", 5)
        assert result == points
        client.query_points.assert_called_once_with(
            collection_name="aks-docs",
            query=[0.1, 0.2],
            limit=5,
            with_payload=True,
        )


class TestRetrieve:
    @patch("app.services.retrieval.search_chunks")
    @patch("app.services.retrieval.embed_query")
    def test_returns_formatted_results(self, mock_embed, mock_search):
        mock_embed.return_value = [0.1, 0.2]
        mock_search.return_value = [
            _make_point(0.95, {
                "title": "Node Pools",
                "url": "https://example.com",
                "text": "Configure node pools...",
                "tags": {"doc_type": "guide"},
                "priority": 10,
            })
        ]

        settings = Settings()
        client = MagicMock()
        results = retrieve("node pools", client, settings)

        assert len(results) == 1
        assert results[0]["title"] == "Node Pools"
        assert results[0]["score"] == 0.95
        assert results[0]["url"] == "https://example.com"
