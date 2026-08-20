#!/usr/bin/env python3
"""Phrase-level playbook audit. Does not need a browser."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load():
    entries = []
    for name in ("errors", "payments", "shipping", "general"):
        for row in json.loads((DATA / f"{name}.json").read_text()):
            row["_file"] = name
            entries.append(row)
    return entries

def hits(entry, hay):
    fields = list(entry.get("match_phrases") or []) + list(entry.get("synonyms") or [])
    n = 0
    longest = 0
    matched = ""
    for phrase in fields:
        p = str(phrase).lower()
        if len(p) >= 4 and p in hay:
            n += 1.6 if len(p) >= 18 else 1
            if len(p) > longest:
                longest = len(p)
                matched = p
    for tag in entry.get("tags") or []:
        if str(tag).lower() in hay:
            n += 0.35
    pri = (4 - max(0, ["errors", "payments", "shipping", "general"].index(entry["_file"]))) * 0.02
    err = 0.08 if entry["_file"] == "errors" else 0
    return n, 0.34 + n * 0.11 + longest / 90 + pri + err, matched

EXPECT = {
    "payouts on hold": "error-payout-hold-banner",
    "your payouts are temporarily on hold": "error-payout-hold-banner",
    "unable to accept payments": "error-unable-accept-payments",
    "no shipping rates": "error-no-shipping-rates",
    "shopify collective": "general-shop-collective-016",
    "custom liquid": "general-custom-liquid-018",
    "edit code": "general-edit-theme-vs-code-017",
    "theme.liquid": "general-head-tag-019",
    "pinterest": "general-pinterest-channel-015",
    "google and youtube": "general-google-youtube-014",
    "test mode is on": "error-test-mode-banner",
    "theme has errors": "error-theme-has-errors",
    "card declined": "error-toast-card-declined",
    "password page": "error-password-page",
    "domain not connected": "error-domain-not-connected",
    "insufficient inventory": "error-inventory-insufficient",
    "past due": "error-billing-past-due",
    "privacy policy": "general-privacy-policy-theme-020",
    "copy privacy policy from settings": "general-privacy-policy-theme-020",
    "add privacy policy to theme": "general-privacy-policy-theme-020",
    "theme changes not showing": "general-theme-not-live-021",
    "too many apps": "general-too-many-apps-025",
    "page speed": "general-page-speed-026",
    "overselling": "general-overselling-027",
    "checkout broken": "general-checkout-css-029",
    "product variants": "general-variants-media-032",
    "prices not switching": "general-markets-currency-033",
}

def main():
    entries = load()
    ids = [e["id"] for e in entries]
    assert len(ids) == len(set(ids)), "duplicate ids"
    failed = 0
    for q, want in EXPECT.items():
        scored = []
        for e in entries:
            n, score, matched = hits(e, q.lower())
            if n > 0:
                scored.append((score, e["id"], matched))
        scored.sort(reverse=True)
        got = scored[0][1] if scored else None
        ok = got == want
        if not ok:
            failed += 1
        print(("OK " if ok else "FAIL"), q, "->", got, "" if ok else f"(want {want})")
    print(f"{len(entries)} entries, {failed} misses")
    raise SystemExit(1 if failed else 0)

if __name__ == "__main__":
    main()
