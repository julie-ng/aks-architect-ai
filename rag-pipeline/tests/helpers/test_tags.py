"""Tests for tag-response parsing helpers."""

from helpers.tags import (
    extract_json_array,
    parse_tag_response,
    strip_code_fences,
)

# ---------------------------------------------------------------------------
# strip_code_fences
# ---------------------------------------------------------------------------


class TestStripCodeFences:
    def test_no_fence_unchanged(self):
        assert strip_code_fences('["topic:x"]') == '["topic:x"]'

    def test_plain_fence(self):
        assert strip_code_fences('```\n["topic:x"]\n```') == '["topic:x"]'

    def test_json_language_fence(self):
        assert strip_code_fences('```json\n["topic:x"]\n```') == '["topic:x"]'

    def test_fence_without_closing(self):
        # Opening fence only — drop the fence line, keep the rest.
        assert strip_code_fences('```json\n["topic:x"]') == '["topic:x"]'


# ---------------------------------------------------------------------------
# extract_json_array
# ---------------------------------------------------------------------------


class TestExtractJsonArray:
    def test_bare_array(self):
        assert extract_json_array('["topic:x"]') == '["topic:x"]'

    def test_array_with_trailing_prose(self):
        # The exact bug: model appends an explanation after the array.
        assert extract_json_array('["topic:x"] This chunk is about X.') == '["topic:x"]'

    def test_empty_array_with_trailing_prose(self):
        assert extract_json_array("[] The provided text discusses Y.") == "[]"

    def test_multiline_array(self):
        content = '[\n  "topic:x",\n  "answer:y"\n]'
        assert extract_json_array(content) == content

    def test_no_array_returns_input(self):
        # Truncated mid-array (no closing bracket) → nothing to extract.
        truncated = '[\n  "topic:organization-type",\n  "top'
        assert extract_json_array(truncated) == truncated

    def test_stops_at_first_array(self):
        # Tag strings never contain "]", so the first bracketed span is the array.
        assert extract_json_array('["topic:x"] and later ["ignored"]') == '["topic:x"]'


# ---------------------------------------------------------------------------
# parse_tag_response
# ---------------------------------------------------------------------------


class TestParseTagResponse:
    def test_clean_array(self):
        tags, ok = parse_tag_response('["topic:networking-plugin", "answer:azure_cni_overlay"]')
        assert ok is True
        assert tags == ["topic:networking-plugin", "answer:azure_cni_overlay"]

    def test_empty_array(self):
        tags, ok = parse_tag_response("[]")
        assert ok is True
        assert tags == []

    def test_empty_array_with_trailing_prose_is_ok(self):
        # Legitimate "no tags" answer that the model over-explained — must NOT warn.
        tags, ok = parse_tag_response("[] The provided text chunk discusses the VPA API.")
        assert ok is True
        assert tags == []

    def test_array_with_trailing_prose_rescued(self):
        tags, ok = parse_tag_response('["topic:x"] This chunk is about networking.')
        assert ok is True
        assert tags == ["topic:x"]

    def test_code_fenced_array(self):
        tags, ok = parse_tag_response('```json\n["topic:x"]\n```')
        assert ok is True
        assert tags == ["topic:x"]

    def test_multiline_array(self):
        tags, ok = parse_tag_response('[\n  "topic:x",\n  "answer:y"\n]')
        assert ok is True
        assert tags == ["topic:x", "answer:y"]

    def test_truncated_array_is_not_ok(self):
        # maxTokens cut the array mid-token → parse failure the caller should warn on.
        tags, ok = parse_tag_response('[\n  "topic:organization-type",\n  "top')
        assert ok is False
        assert tags == []

    def test_non_list_json_is_not_ok(self):
        # Valid JSON but not an array (e.g. an object) → treat as failure.
        tags, ok = parse_tag_response('{"tag": "topic:x"}')
        assert ok is False
        assert tags == []

    def test_pure_prose_is_not_ok(self):
        tags, ok = parse_tag_response("I cannot classify this chunk.")
        assert ok is False
        assert tags == []

    def test_non_string_elements_filtered(self):
        tags, ok = parse_tag_response('["topic:x", 123, null, "answer:y"]')
        assert ok is True
        assert tags == ["topic:x", "answer:y"]

    def test_leading_whitespace(self):
        tags, ok = parse_tag_response('   \n  ["topic:x"]  ')
        assert ok is True
        assert tags == ["topic:x"]
