"""Sentence-level policy red-flag rules (§6.3). Deterministic regex only; text is data."""
import re
import uuid
from dataclasses import dataclass

NEGATION = r"\b(?:do not|don't|does not|doesn't|never|will not|won't|not)\b[^.;]{0,30}?"
HEDGE = re.compile(r"\b(?:may|might|could|from time to time)\b", re.I)
DATA_VERB = re.compile(r"\b(?:collect\w*|shar\w*|use[sd]?|using|disclos\w*|process\w*|transfer\w*|obtain\w*|gather\w*)\b", re.I)


@dataclass(frozen=True)
class Rule:
    rule_id: str
    category: str
    pattern: str
    explanation: str
    recommendation: str
    hedgeable: bool = True          # a "may"-style sentence downgrades to keyword_match_review
    always_review: bool = False     # keyword-only match: always needs review
    negatable: bool = True          # "we do not sell" must not fire
    needs_data_verb: bool = False   # vague rules fire only next to a collection/sharing verb

    def regex(self) -> re.Pattern:
        return re.compile(self.pattern, re.I)


# Within a category the first matching rule wins (most specific first).
RULES: list[Rule] = [
    # collection
    Rule("COL-01", "collection", r"\b(?:precise|exact|gps|real-time)\s+(?:geo)?location\b|\bgeolocation\b",
         "The policy states that precise location is collected. This is a sensitive data type.",
         "Consider whether this site genuinely needs your precise location."),
    Rule("COL-02", "collection", r"\b(?:contacts|address book|contact list)\b",
         "The policy mentions collecting your contacts, which also exposes other people's data.",
         "Avoid granting contact access unless the feature clearly needs it."),
    Rule("COL-03", "collection", r"\b(?:biometric|face ?print|voice ?print|fingerprint|camera|microphone|audio recordings?)\b",
         "The policy mentions biometric, camera or microphone data, which is highly sensitive.",
         "Check when the site turns these on and whether you can refuse."),
    Rule("COL-04", "collection", r"\bdevice identifiers?\b|\b(?:ip address|advertising id|device id)\b",
         "The policy mentions device identifiers, which can be used to track you across sessions.",
         "Look for an opt-out from tracking or analytics."),
    Rule("COL-05", "collection", r"\bwe (?:also )?(?:may )?collect\b|\binformation (?:that )?you provide\b",
         "The policy states that personal information is collected.",
         "Check what is collected and whether each item is needed for the service."),
    # sharing
    Rule("SHARE-01", "sharing", r"\b(?:shar\w*|disclos\w*|provid\w*)\b[^.]{0,60}?\b(?:advertis\w*|marketing partners?|ad partners?|ad networks?)\b",
         "The policy explicitly states that your data is shared with advertising partners. This may mean ads are targeted using your activity on this site.",
         "Check whether the site offers an opt-out from ad targeting."),
    Rule("SHARE-02", "sharing", r"\b(?:shar\w*|disclos\w*|transfer\w*)\b[^.]{0,60}?\b(?:third[- ]part(?:y|ies)|partners?|affiliates?)\b",
         "The policy states that your data is shared with third parties, partners or affiliates.",
         "Look for a list of who receives your data and why."),
    Rule("SHARE-03", "sharing", r"\bservice providers?\b",
         "The policy mentions sharing with service providers. This is common, but they still receive your data.",
         "Check whether service providers are limited to acting on the site's behalf.",
         always_review=True),
    # sale
    Rule("SALE-01", "sale", r"\bsell\w*\b|\bsale of (?:your )?(?:personal )?(?:data|information)\b",
         "The policy states that your personal data may be sold.",
         "Look for a 'Do not sell my personal information' option and use it."),
    Rule("SALE-02", "sale", r"\bin exchange for\b|\bmonetiz\w*\b",
         "The policy suggests your data may be exchanged for money or other value.",
         "Read this section closely; it can amount to a sale of data.",
         always_review=True),
    # retention
    Rule("RET-01", "retention", r"\bindefinitely\b|\bpermanently\b|\bfor as long as we (?:like|wish|want)\b",
         "The policy says data may be kept indefinitely.",
         "Delete your account when you stop using the service, if deletion is offered.",
         hedgeable=False),
    Rule("RET-02", "retention", r"\bas long as (?:is )?(?:necessary|needed|required)\b",
         "'As long as necessary' is vague. It gives no concrete timeframe for how long your data is kept.",
         "Look for a more specific retention period or ask the service directly.",
         always_review=True, hedgeable=False),
    Rule("RET-03", "retention", r"\bfor a period of\b|\bretain\w*\b[^.]{0,40}?\b\d+\s+(?:days|months|years)\b",
         "The policy gives a concrete retention period. This is a positive sign.",
         "Note the period in case you want to check it later.",
         hedgeable=False),
    # deletion (positive)
    Rule("DEL-01", "deletion", r"\b(?:request|ask for)\s+(?:the\s+)?deletion\b|\bdelete your (?:account|data|information|personal)\b|\bright to (?:erasure|be forgotten|delete)\b",
         "The policy offers a deletion mechanism. This is a positive sign.",
         "Note the process in case you want to delete your account later.",
         hedgeable=False),
    # vague (only next to a data verb)
    Rule("VAG-01", "vague", r"\bincluding,? but not limited to\b",
         "'Including but not limited to' leaves the list open-ended.",
         "Assume more data types are involved than the ones listed.",
         always_review=True, needs_data_verb=True, negatable=False),
    Rule("VAG-02", "vague", r"\bfrom time to time\b",
         "'From time to time' gives no indication of how often this happens.",
         "Look for specifics elsewhere in the policy.",
         always_review=True, needs_data_verb=True, negatable=False),
    Rule("VAG-03", "vague", r"\bfor (?:business|other|legitimate business|internal) purposes\b",
         "'Business purposes' is broad and could cover almost any use.",
         "Look for a specific list of purposes.",
         always_review=True, needs_data_verb=True, negatable=False),
    Rule("VAG-04", "vague", r"\b(?:may|might)\b",
         "Hedged wording ('may') makes it unclear whether this actually happens.",
         "Treat this as something that can happen.",
         always_review=True, needs_data_verb=True, negatable=False),
]

NO_DELETION = Rule(
    "DEL-00", "deletion", "",
    "No sentence in the policy describes how to delete your data or account.",
    "Ask the service how to delete your data before relying on it.",
)

_COMPILED = [(r, r.regex()) for r in RULES]
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> list[tuple[int, int, str]]:
    """Return (start, end, sentence) with offsets into the original text."""
    out = []
    for line in re.finditer(r"[^\r\n]+", text):
        base = line.start()
        segment = line.group(0)
        pos = 0
        for m in list(_SENTENCE_END.finditer(segment)) + [None]:
            end = m.start() if m else len(segment)
            chunk = segment[pos:end]
            stripped = chunk.strip()
            if stripped:
                lead = len(chunk) - len(chunk.lstrip())
                s = base + pos + lead
                out.append((s, s + len(stripped), stripped))
            if m:
                pos = m.end()
    return out


def _negated(rule_rx: re.Pattern, sentence: str) -> bool:
    """True when every match of the rule is preceded by a nearby negation."""
    matches = list(rule_rx.finditer(sentence))
    if not matches:
        return False
    neg = re.compile(NEGATION + r"$", re.I)
    for m in matches:
        if not neg.search(sentence[: m.start()]):
            return False
    return True


def analyze(text: str, origin: str | None) -> list[dict]:
    findings: list[dict] = []
    has_deletion = False
    for start, end, sentence in split_sentences(text):
        hedged = bool(HEDGE.search(sentence))
        has_data_verb = bool(DATA_VERB.search(sentence))
        seen_categories: set[str] = set()
        for rule, rx in _COMPILED:
            if rule.category in seen_categories:
                continue
            if rule.needs_data_verb and not has_data_verb:
                continue
            if not rx.search(sentence):
                continue
            if rule.negatable and _negated(rx, sentence):
                continue
            seen_categories.add(rule.category)
            if rule.category == "deletion":
                has_deletion = True
            review = rule.always_review or (rule.hedgeable and hedged)
            findings.append({
                "id": str(uuid.uuid4()),
                "origin": origin,
                "excerpt": sentence,
                "char_start": start,
                "char_end": end,
                "category": rule.category,
                "rule_id": rule.rule_id,
                "explanation": rule.explanation,
                "recommendation": rule.recommendation,
                "evidence_type": "keyword_match_review" if review else "explicit_statement",
                "provenance": "inferred" if review else "policy_declared",
            })
    if not has_deletion:
        findings.append({
            "id": str(uuid.uuid4()),
            "origin": origin,
            "excerpt": "",
            "char_start": 0,
            "char_end": 0,
            "category": "deletion",
            "rule_id": NO_DELETION.rule_id,
            "explanation": NO_DELETION.explanation,
            "recommendation": NO_DELETION.recommendation,
            "evidence_type": "keyword_match_review",
            "provenance": "inferred",
        })
    return findings
