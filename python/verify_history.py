#!/usr/bin/env python3
"""Verify retained historical copies without upgrading their secondary provenance.
Knowledge text must agree between pypdf/pdfplumber. Both answer grids are visually
transcribed independently, then checked through a bijective content/option map.
"""

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
import extract as extraction

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/verified/history"


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def compact(s):
    return re.sub(r"\s+", "", s)


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


class TextPage:
    def __init__(self, text):
        self.text = text

    def extract_text(self):
        return self.text


class PlumberReader:
    def __init__(self, path):
        with pdfplumber.open(path) as pdf:
            self.pages = [TextPage(p.extract_text() or "") for p in pdf.pages]


class UnwatermarkedReader:
    def __init__(self, path):
        self.pages = [
            TextPage(
                "\n".join(
                    line
                    for line in (p.extract_text() or "").splitlines()
                    if not re.fullmatch(
                        r"\s*VM OPOSICIONES\s*·\s*vmoposiciones\.com\s*", line
                    )
                )
            )
            for p in PdfReader(path).pages
        ]


def extract_with(path, reader):
    old = extraction.PdfReader
    try:
        extraction.PdfReader = reader
        return extraction.extract(path)["questions"]
    finally:
        extraction.PdfReader = old


def equal(a, b):
    return compact(a["stem"]) == compact(b["stem"]) and list(
        map(compact, a["options"])
    ) == list(map(compact, b["options"]))


def run():
    config = json.loads((BASE / "config.json").read_text())
    matrices = json.loads((BASE / "key-transcriptions.json").read_text())
    sources = json.loads((ROOT / "data/source-catalog.json").read_text())["sources"]
    curation_path = BASE / "curation.json"
    curation = json.loads(curation_path.read_text()) if curation_path.exists() else {}
    corrections = json.loads((BASE / "literal-corrections.json").read_text())
    restorations = (
        json.loads((BASE / "extractor-restorations.json").read_text())
        if (BASE / "extractor-restorations.json").exists()
        else {}
    )
    forms = []
    used_sources = set()
    for form in config["forms"]:
        year, family = form["year"], form["form"]
        models = []
        for model in form["models"]:
            path = ROOT / model["path"]
            source = next(s for s in sources if s["id"] == model["sourceId"])
            assert sha(path) == source["sha256"], "Changed retained source"
            assert source["origin"] == "secondary" and not source.get("definitive")
            proof = source["corroboration"]
            assert (
                len(
                    {
                        __import__("urllib.parse", fromlist=["urlparse"])
                        .urlparse(m["url"])
                        .hostname
                        for m in proof["matches"]
                    }
                )
                >= 2
            )
            if proof["method"] == "byte_identity":
                assert all(m["sha256"] == source["sha256"] for m in proof["matches"])
            pypdf = extract_with(path, PdfReader)
            plumber = extract_with(path, PlumberReader)
            cache = ROOT / ".local/history-research/extracted"
            cache.mkdir(parents=True, exist_ok=True)
            for engine, rows in [("pypdf", pypdf), ("plumber", plumber)]:
                (cache / f'{year}-{model["model"]}-{engine}.json').write_text(
                    json.dumps({"questions": rows}, ensure_ascii=False, indent=2) + "\n"
                )
            assert len(pypdf) == len(plumber) == 105
            assert [q["number"] for q in pypdf] == list(range(1, 106))
            corroborating = (
                extract_with(ROOT / model["corroboratingPath"], UnwatermarkedReader)
                if year == 2025
                else None
            )
            if corroborating is not None:
                assert len(corroborating) == 105
            rows = [r.split() for r in matrices["matrices"][f'{year}-{model["model"]}']]
            assert len(rows) == 10 and all(
                len(row) == 10 and all(c in "ABCD" for c in row) for row in rows
            )
            answers = {
                10 * c + r + 1: ord(rows[r][c]) - 65
                for r in range(10)
                for c in range(10)
            }
            answers.update(
                {
                    101 + i: ord(a) - 65
                    for i, a in enumerate(
                        matrices["reserves"][f"{year}-{family}"].split()
                    )
                }
            )
            assert len(answers) == 105
            for i, (a, b) in enumerate(zip(pypdf, plumber)):
                assert equal(a, b), (
                    year,
                    model["model"],
                    a["number"],
                    "extractor disagreement",
                )
                assert a["sourcePage"] == b["sourcePage"] and 3 <= a["sourcePage"] <= 17
                assert a["reserve"] == (a["number"] > 100)
                assert len(a["options"]) == len(set(map(compact, a["options"]))) == 4
                assert not any(
                    re.search(r"Resolución (?:núm\.? )?160/", s)
                    for s in [a["stem"], *a["options"]]
                ), "Page header leaked"
                if corroborating is not None:
                    assert equal(a, corroborating[i]), (
                        "2025 independent copy disagreement",
                        model["model"],
                        a["number"],
                    )
                a.update(
                    stem=clean(a["stem"]),
                    options=list(map(clean, a["options"])),
                    correct=answers[a["number"]],
                    keyPage=form["keyPages"][model["model"][-1]],
                    checks=[
                        "two_pdf_engines_agree",
                        "four_literal_options",
                        "knowledge_section_and_number",
                        "manual_answer_grid",
                        "independent_copy_consistency",
                    ],
                )
                changes = corrections.get(f'{year}-{model["model"]}-{a["number"]}', [])
                for change in changes:
                    assert (
                        change["field"] == "stem"
                        and change["sourcePage"] == a["sourcePage"]
                    )
                    assert (
                        compact(change["from"]) == compact(change["to"])
                        and change["from"] in a["stem"]
                    )
                    a["stem"] = a["stem"].replace(change["from"], change["to"])
                restoration = restorations.get(f'{year}-{model["model"]}-{a["number"]}')
                if restoration:
                    assert (
                        restoration["to"] == a["stem"]
                        and restoration["sourcePage"] == a["sourcePage"]
                    )
                a["extractionCorrections"] = [
                    *changes,
                    *([restoration] if restoration else []),
                ]
                a["classification"] = curation.get(
                    f'{year}-{model["model"]}-{a["number"]}', {}
                )
            models.append({**model, "sha256": source["sha256"], "questions": pypdf})
            used_sources.add(source["id"])
        pairs = []
        seen = set()
        for a in models[0]["questions"]:
            candidates = [
                b
                for b in models[1]["questions"]
                if b["number"] not in seen
                and b["reserve"] == a["reserve"]
                and sorted(map(compact, a["options"]))
                == sorted(map(compact, b["options"]))
                and (
                    compact(a["stem"]) == compact(b["stem"])
                    or (year == 2025 and a["number"] == 58 and b["number"] == 25)
                )
            ]
            assert len(candidates) == 1, (
                year,
                family,
                a["number"],
                "non-bijective model equivalence",
            )
            b = candidates[0]
            seen.add(b["number"])
            mapping = [
                list(map(compact, a["options"])).index(compact(s)) for s in b["options"]
            ]
            assert mapping[b["correct"]] == a["correct"], (
                year,
                family,
                a["number"],
                b["number"],
                "key disagreement",
            )
            notes = []
            if compact(a["stem"]) != compact(b["stem"]):
                assert year == 2025 and a["number"] == 58 and b["number"] == 25
                notes = [
                    "A58: Administraciones; B25: dministraciones. Errata literal conservada. Mismas opciones y clave."
                ]
            pairs.append(
                {
                    "a": a["number"],
                    "b": b["number"],
                    "bOptionToCanonical": mapping,
                    "reserve": a["reserve"],
                    "notes": notes,
                }
            )
            b["classification"] = a["classification"]
        assert len(seen) == 105
        key = next(s for s in sources if s["id"] == form["keySourceId"])
        assert (
            key["origin"] == "secondary"
            and sha(ROOT / key["localPath"]) == key["sha256"]
        )
        assert all(
            m["sha256"] == key["sha256"] for m in key["corroboration"]["matches"]
        ), "Key copies do not agree byte-for-byte"
        used_sources.add(key["id"])
        forms.append(
            {
                **form,
                "models": models,
                "pairs": pairs,
                "keySha256": key["sha256"],
                "administrativeFinalityConfirmed": False,
            }
        )
        print(
            year,
            family or "A/B",
            form["session"],
            "105 pairs / 100 ordinary; secondary corroborated, finality unknown",
            flush=True,
        )
    artifact = {
        "schemaVersion": 1,
        "id": "gc-historical-corroborated-v1",
        "computedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "corroborated_documentary",
        "forms": forms,
        "sources": [s for s in sources if s["id"] in used_sources],
        "limitations": config["limitations"],
    }
    (BASE / "bank.json").write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n"
    )
    manifest = {
        "schemaVersion": 1,
        "files": [
            {"path": str(p.relative_to(ROOT)), "sha256": sha(p)}
            for p in sorted(BASE.glob("*.json"))
            if p.name != "manifest.json"
        ],
    }
    (BASE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    run()
