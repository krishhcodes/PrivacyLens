from pathlib import Path

from app.rules.policy import analyze, split_sentences

SAMPLE = (Path(__file__).resolve().parents[2] / "contracts" / "examples" / "sample_policy.txt").read_text()


def rules(text):
    return {f["rule_id"]: f for f in analyze(text, None)}


def test_sample_hits_each_required_category():
    cats = {f["category"] for f in analyze(SAMPLE, None)}
    assert {"collection", "sharing", "retention", "deletion"} <= cats


def test_offsets_point_at_exact_sentence():
    for f in analyze(SAMPLE, None):
        if f["excerpt"]:
            assert SAMPLE[f["char_start"]:f["char_end"]] == f["excerpt"]


def test_split_keeps_offsets():
    text = "One. Two!\n\n  Three?"
    assert [s[2] for s in split_sentences(text)] == ["One.", "Two!", "Three?"]
    for s, e, t in split_sentences(text):
        assert text[s:e] == t


def test_sale_explicit():
    f = rules("We sell your personal information.")["SALE-01"]
    assert f["evidence_type"] == "explicit_statement" and f["provenance"] == "policy_declared"


def test_sale_negation_guard():
    assert "SALE-01" not in rules("We do not sell your data.")
    assert "SALE-01" not in rules("We never sell or rent your personal information.")
    assert "SALE-01" not in rules("We don't sell data.")


def test_hedged_sale_needs_review():
    assert rules("We may sell your information.")["SALE-01"]["evidence_type"] == "keyword_match_review"


def test_sharing_advertisers_and_third_parties():
    assert "SHARE-01" in rules("We share data with advertising partners.")
    assert "SHARE-02" in rules("We may disclose information to third parties.")
    assert "SHARE-02" not in rules("We do not share your data with third parties.")


def test_one_finding_per_sentence_per_category():
    found = analyze("We share data with advertisers and third parties and affiliates.", None)
    assert [f["category"] for f in found].count("sharing") == 1


def test_retention_vague_vs_concrete():
    assert rules("We retain data as long as necessary.")["RET-02"]["provenance"] == "inferred"
    assert "RET-01" in rules("We keep your data indefinitely.")
    assert "RET-03" in rules("We retain logs for 30 days.")


def test_deletion_present_and_absent():
    assert "DEL-01" in rules("You can request deletion of your data.")
    assert "DEL-00" not in rules("You can request deletion of your data.")
    missing = rules("We collect your email.")["DEL-00"]
    assert missing["provenance"] == "inferred" and missing["excerpt"] == ""


def test_vague_needs_data_verb():
    assert "VAG-02" not in rules("We update this page from time to time.")
    assert "VAG-02" in rules("We collect usage data from time to time.")
    assert "VAG-04" not in rules("You may contact us any time.")


def test_html_is_just_text():
    f = analyze("<script>alert(1)</script> We sell your data.", None)
    assert any("<script>" in x["excerpt"] for x in f)
