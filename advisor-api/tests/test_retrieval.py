from unittest.mock import MagicMock, patch

from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

from app.config import Settings
from app.services.retrieval import boost_by_priority, build_filter, embed_query, retrieve, search_chunks


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


class TestBuildFilter:
    def test_single_string_value(self):
        f = build_filter({"tags.doc_type": "guide"})
        assert f == Filter(must=[
            FieldCondition(key="tags.doc_type", match=MatchValue(value="guide")),
        ])

    def test_list_value(self):
        f = build_filter({"tags.scenario_tags": ["regulated", "pci-dss"]})
        assert f == Filter(must=[
            FieldCondition(key="tags.scenario_tags", match=MatchAny(any=["regulated", "pci-dss"])),
        ])

    def test_mixed_values(self):
        f = build_filter({
            "tags.doc_type": "guide",
            "tags.scenario_tags": ["regulated"],
        })
        assert len(f.must) == 2


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
            query_filter=None,
        )

    def test_passes_filter(self):
        client = MagicMock()
        client.query_points.return_value = MagicMock(points=[])

        search_chunks(client, [0.1], "col", 5, filters={"tags.doc_type": "guide"})
        call_kwargs = client.query_points.call_args.kwargs
        assert call_kwargs["query_filter"] is not None
        assert call_kwargs["query_filter"].must[0].key == "tags.doc_type"


class TestBoostByPriority:
    def test_higher_priority_ranks_higher(self):
        results = [
            {"score": 0.90, "priority": 10},
            {"score": 0.88, "priority": 50},
        ]
        boosted = boost_by_priority(results, weight=0.1)
        # priority-50 chunk should now rank first despite lower similarity
        assert boosted[0]["priority"] == 50
        assert boosted[1]["priority"] == 10

    def test_equal_priority_preserves_similarity_order(self):
        results = [
            {"score": 0.95, "priority": 10},
            {"score": 0.80, "priority": 10},
        ]
        boosted = boost_by_priority(results, weight=0.1)
        assert boosted[0]["score"] == 0.95
        assert boosted[1]["score"] == 0.80

    def test_none_priority_treated_as_1(self):
        results = [{"score": 0.9, "priority": None}]
        boosted = boost_by_priority(results, weight=0.1)
        # log(1) = 0, so boosted_score == score
        assert boosted[0]["boosted_score"] == 0.9

    def test_zero_priority_treated_as_1(self):
        results = [{"score": 0.9, "priority": 0}]
        boosted = boost_by_priority(results, weight=0.1)
        assert boosted[0]["boosted_score"] == 0.9

    def test_weight_zero_means_no_boost(self):
        results = [
            {"score": 0.80, "priority": 50},
            {"score": 0.90, "priority": 10},
        ]
        boosted = boost_by_priority(results, weight=0.0)
        # With no boost, pure similarity order
        assert boosted[0]["score"] == 0.90
        assert boosted[1]["score"] == 0.80


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
        assert results[0]["url"] == "https://example.com"
        assert "boosted_score" in results[0]

    @patch("app.services.retrieval.search_chunks")
    @patch("app.services.retrieval.embed_query")
    def test_fetches_extra_candidates(self, mock_embed, mock_search):
        mock_embed.return_value = [0.1]
        mock_search.return_value = []

        settings = Settings()
        client = MagicMock()
        retrieve("test", client, settings)

        # Should fetch top_k * 3 candidates
        call_args = mock_search.call_args
        assert call_args[0][3] == settings.retrieval_top_k * 3

    @patch("app.services.retrieval.search_chunks")
    @patch("app.services.retrieval.embed_query")
    def test_trims_to_top_k(self, mock_embed, mock_search):
        mock_embed.return_value = [0.1]
        # Return more results than top_k
        mock_search.return_value = [
            _make_point(0.9 - i * 0.01, {
                "title": f"Doc {i}",
                "url": "",
                "text": "",
                "tags": {},
                "priority": 10,
            })
            for i in range(15)
        ]

        settings = Settings()
        client = MagicMock()
        results = retrieve("test", client, settings)

        assert len(results) == settings.retrieval_top_k

    @patch("app.services.retrieval.search_chunks")
    @patch("app.services.retrieval.embed_query")
    def test_passes_filters(self, mock_embed, mock_search):
        mock_embed.return_value = [0.1]
        mock_search.return_value = []

        settings = Settings()
        client = MagicMock()
        filters = {"tags.doc_type": "guide"}
        retrieve("test", client, settings, filters=filters)

        call_kwargs = mock_search.call_args
        assert call_kwargs[0][4] == filters
