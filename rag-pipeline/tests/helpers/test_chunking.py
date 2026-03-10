"""Tests for chunking helpers."""

from helpers.chunking import (
    deduplicate,
    merge_small_chunks,
    sections_to_chunks,
    split_by_headings,
    split_on_paragraphs,
)


# ---------------------------------------------------------------------------
# split_by_headings
# ---------------------------------------------------------------------------

class TestSplitByHeadings:
    def test_single_section(self):
        md = "## Overview\n\nSome content here."
        sections = split_by_headings(md)
        assert sections == [("## Overview", "Some content here.")]

    def test_multiple_sections(self):
        md = "## First\n\nBody one.\n\n### Second\n\nBody two."
        sections = split_by_headings(md)
        assert len(sections) == 2
        assert sections[0] == ("## First", "Body one.")
        assert sections[1] == ("### Second", "Body two.")

    def test_text_before_first_heading(self):
        md = "Intro paragraph.\n\n## Heading\n\nBody."
        sections = split_by_headings(md)
        assert len(sections) == 2
        assert sections[0] == ("", "Intro paragraph.")
        assert sections[1] == ("## Heading", "Body.")

    def test_h1_not_split(self):
        """# headings should not be treated as split points."""
        md = "# Title\n\nIntro.\n\n## Section\n\nContent."
        sections = split_by_headings(md)
        assert len(sections) == 2
        assert sections[0][1] == "# Title\n\nIntro."
        assert sections[1] == ("## Section", "Content.")

    def test_heading_only_section(self):
        md = "## Heading One\n\n## Heading Two\n\nBody."
        sections = split_by_headings(md)
        assert len(sections) == 2
        assert sections[0] == ("## Heading One", "")
        assert sections[1] == ("## Heading Two", "Body.")

    def test_h4_heading(self):
        md = "#### Deep heading\n\nDeep content."
        sections = split_by_headings(md)
        assert sections == [("#### Deep heading", "Deep content.")]

    def test_empty_input(self):
        assert split_by_headings("") == []
        assert split_by_headings("   ") == []


# ---------------------------------------------------------------------------
# split_on_paragraphs
# ---------------------------------------------------------------------------

class TestSplitOnParagraphs:
    def test_short_text_unchanged(self):
        text = "Short text."
        assert split_on_paragraphs(text, 100) == ["Short text."]

    def test_splits_on_blank_lines(self):
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        result = split_on_paragraphs(text, 30)
        assert len(result) >= 2
        assert all(len(c) <= 30 for c in result)

    def test_packs_paragraphs_together(self):
        text = "Short.\n\nAlso short."
        result = split_on_paragraphs(text, 100)
        assert result == ["Short.\n\nAlso short."]

    def test_oversized_single_paragraph_kept(self):
        text = "A" * 200
        result = split_on_paragraphs(text, 100)
        assert result == [text]

    def test_exact_boundary(self):
        text = "12345\n\n67890"
        result = split_on_paragraphs(text, 11)
        # "12345\n\n67890" is 13 chars, should split
        assert len(result) == 2


# ---------------------------------------------------------------------------
# merge_small_chunks
# ---------------------------------------------------------------------------

class TestMergeSmallChunks:
    def test_merges_tiny_into_next(self):
        chunks = ["Hi", "This is a longer chunk that should absorb the tiny one."]
        result = merge_small_chunks(chunks, min_chars=50)
        assert len(result) == 1
        assert "Hi" in result[0]
        assert "longer chunk" in result[0]

    def test_large_chunks_not_merged(self):
        chunks = ["A" * 200, "B" * 200]
        result = merge_small_chunks(chunks, min_chars=50)
        assert len(result) == 2

    def test_empty_input(self):
        assert merge_small_chunks([], min_chars=50) == []

    def test_single_tiny_chunk(self):
        result = merge_small_chunks(["Hi"], min_chars=50)
        assert result == ["Hi"]


# ---------------------------------------------------------------------------
# deduplicate
# ---------------------------------------------------------------------------

class TestDeduplicate:
    def test_removes_duplicates(self):
        assert deduplicate(["a", "b", "a", "c"]) == ["a", "b", "c"]

    def test_preserves_order(self):
        assert deduplicate(["c", "b", "a"]) == ["c", "b", "a"]

    def test_no_duplicates(self):
        assert deduplicate(["a", "b", "c"]) == ["a", "b", "c"]

    def test_all_same(self):
        assert deduplicate(["x", "x", "x"]) == ["x"]

    def test_empty(self):
        assert deduplicate([]) == []


# ---------------------------------------------------------------------------
# sections_to_chunks (integration of the above)
# ---------------------------------------------------------------------------

class TestSectionsToChunks:
    def test_basic_pipeline(self):
        sections = [
            ("## First", "Content of the first section goes here with enough text."),
            ("## Second", "Content of the second section also has enough text here."),
        ]
        result = sections_to_chunks(sections, max_chars=1500, min_chars=10)
        assert len(result) == 2
        assert "## First" in result[0]
        assert "## Second" in result[1]

    def test_deduplication(self):
        sections = [
            ("## Same", "Identical body content repeated."),
            ("## Same", "Identical body content repeated."),
        ]
        result = sections_to_chunks(sections, max_chars=1500, min_chars=10)
        assert len(result) == 1

    def test_filters_tiny_chunks(self):
        sections = [("## Hi", "")]
        result = sections_to_chunks(sections, max_chars=1500, min_chars=100)
        assert len(result) == 0

    def test_splits_oversized(self):
        long_body = "\n\n".join(f"Paragraph {i} with some content." for i in range(20))
        sections = [("## Big", long_body)]
        result = sections_to_chunks(sections, max_chars=200, min_chars=10)
        assert len(result) > 1
        assert all(len(c) <= 200 or "\n\n" not in c for c in result)
