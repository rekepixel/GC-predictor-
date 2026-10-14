#!/usr/bin/env python3
"""Reproducible documentary verification, not an assertion of administrative finality.
Checks two independent PDF text engines, two models and the official key correction.
"""

import json, re, hashlib, sys
from pathlib import Path
from datetime import datetime, timezone
from pypdf import PdfReader
import pdfplumber
from extract import extract, key_2026
import extract as extraction

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def compact(s):
    return re.sub(r"\s+", "", s)


def text(s):
    return re.sub(r"\s+", " ", s).strip()


class PlumberPage:
    def __init__(self, t):
        self.t = t

    def extract_text(self):
        return self.t


class PlumberReader:
    def __init__(self, path):
        with pdfplumber.open(path) as reader:
            self.pages = [PlumberPage(p.extract_text() or "") for p in reader.pages]


def run():
    catalog = json.loads((ROOT / "data/source-catalog.json").read_text())
    retrieval = json.loads((ROOT / "data/research/2026-retrieval.json").read_text())
    docs = []
    models = []
    for model in ["A", "B"]:
        source = next(s for s in catalog["sources"] if s["id"] == f"exam-2026-{model}")
        path = ROOT / source["localPath"]
        assert sha(path) == source["sha256"], "Original exam changed"
        cover = PdfReader(path).pages[0].extract_text()
        assert "160/38243/2026" in cover and "5 de mayo" in cover and "2026" in cover
        pyp = extract(path)
        old = extraction.PdfReader
        try:
            extraction.PdfReader = PlumberReader
            plumber = extract(path)
        finally:
            extraction.PdfReader = old
        assert len(pyp["questions"]) == len(plumber["questions"]) == 105
        assert [q["number"] for q in plumber["questions"]] == list(range(1, 106))
        current = key_2026(ROOT / "data/raw/2026-answer-key-corrected.pdf", model)
        oldkey = key_2026(ROOT / "data/raw/2026-answer-key-original.pdf", model)
        # Independently parse the labelled tables with a second PDF engine.
        try:
            extraction.PdfReader = PlumberReader
            second = key_2026(ROOT / "data/raw/2026-answer-key-corrected.pdf", model)
        finally:
            extraction.PdfReader = old
        assert current == second, "Answer key engines disagree"
        diffs = [
            {"number": a["number"], "old": a["correct"], "new": b["correct"]}
            for a, b in zip(oldkey, current)
            if a["correct"] != b["correct"]
        ]
        assert diffs == [
            {"number": 7 if model == "A" else 88, "old": 2, "new": 0}
        ], diffs
        keys = {r["number"]: r["correct"] for r in current}
        for q, p in zip(plumber["questions"], pyp["questions"]):
            assert q["number"] == p["number"] and q["sourcePage"] == p["sourcePage"]
            assert compact(q["stem"]) == compact(p["stem"])
            assert all(
                compact(a) == compact(b) for a, b in zip(q["options"], p["options"])
            )
            assert len(q["options"]) == 4 and len(set(map(compact, q["options"]))) == 4
            assert q["reserve"] == (q["number"] > 100)
            q["stem"] = text(q["stem"])
            q["options"] = [text(o) for o in q["options"]]
            q.update(
                correct=keys[q["number"]],
                keyPage=1 if model == "A" and q["number"] <= 100 else 2,
                checks={
                    "twoExtractorsAgreeIgnoringWhitespace": True,
                    "fourOptions": True,
                    "numberAndSectionChecked": True,
                    "keyExtractorsAgree": True,
                },
            )
        models.append(
            {
                "model": model,
                "sourceId": source["id"],
                "questions": plumber["questions"],
            }
        )
        docs.append(
            {
                "id": source["id"],
                "path": source["localPath"],
                "url": source["url"],
                "sha256": sha(path),
            }
        )
    pairs = []
    used = set()
    discrepancies = []
    for a in models[0]["questions"]:
        candidates = [
            b
            for b in models[1]["questions"]
            if b["number"] not in used
            and b["reserve"] == a["reserve"]
            and compact(b["stem"]) == compact(a["stem"])
        ]
        assert len(candidates) == 1, (a["number"], len(candidates))
        b = candidates[0]
        mapping = []
        notes = []
        for index, option in enumerate(b["options"]):
            matches = [
                i for i, o in enumerate(a["options"]) if compact(o) == compact(option)
            ]
            if (
                not matches
                and a["number"] == 28
                and b["number"] == 62
                and index == 2
                and a["options"][2] == "Noveno"
                and option == "Noveno."
            ):
                matches = [2]
                notes.append(
                    "El original A28 opción C imprime «Noveno»; B62 imprime «Noveno.». Se conserva la diferencia literal y se coteja como la misma alternativa, sin cambio de contenido."
                )
            assert len(matches) == 1, (a["number"], b["number"], index, option)
            mapping.append(matches[0])
        assert sorted(mapping) == list(range(4))
        assert mapping[b["correct"]] == a["correct"]
        used.add(b["number"])
        pairs.append(
            {
                "canonicalNumber": a["number"],
                "a": a["number"],
                "b": b["number"],
                "bOptionToCanonical": mapping,
                "reserve": a["reserve"],
                "method": (
                    "exact_non_whitespace_characters_with_documented_exception"
                    if notes
                    else "exact_non_whitespace_characters"
                ),
                "notes": notes,
            }
        )
        if notes:
            discrepancies.extend(notes)
    assert len(used) == 105 and sum(not p["reserve"] for p in pairs) == 100
    for id, name in [
        ("key-2026-corrected", "2026-answer-key-corrected.pdf"),
        ("key-2026-original", "2026-answer-key-original.pdf"),
    ]:
        retr = next(r for r in retrieval if r["id"] == id)
        path = ROOT / "data/raw" / name
        assert sha(path) == retr["sha256"]
        docs.append(
            {
                "id": id,
                "path": f"data/raw/{name}",
                "url": retr["url"],
                "sha256": sha(path),
            }
        )
    page = ROOT / "data/research/2026-process-page.html"
    page_record = next(r for r in retrieval if r["id"] == "official-process-2026")
    assert sha(page) == page_record["sha256"]
    from html import unescape

    page_text = unescape(re.sub("<[^>]+>", " ", page.read_text())).replace("\xa0", " ")
    assert (
        "PDF nº 2" in page_text
        and "INFORMACIÓN ACTUALIZADA" in page_text
        and "88" in page_text
    )
    artifact = {
        "schemaVersion": 1,
        "id": "gc-2026-documentary-v1",
        "computedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "official_corrected_documentary",
        "administrativeFinalityConfirmed": False,
        "questionCount": 105,
        "ordinaryCount": 100,
        "reserveCount": 5,
        "occurrences": 210,
        "models": models,
        "pairs": pairs,
        "documents": docs,
        "officialPage": page_record,
        "corrections": [
            {
                "a": 7,
                "b": 88,
                "previous": "C",
                "current": "A",
                "authority": "official-process-2026",
                "supersededKey": "key-2026-original",
                "appliedKey": "key-2026-corrected",
            }
        ],
        "discrepancies": discrepancies
        + [
            "La cabecera de ambas claves contiene «160/3824032026 de 23 de mayo»; los cuestionarios y el BOE acreditan Resolución 160/38243/2026 de 5 de mayo. No se altera el original."
        ],
        "limitations": [
            "Cotejo documental con dos extractores de texto PDF, correspondencia A/B y contraste de ambas tablas de respuestas; no se declara una revisión humana independiente de los 210 registros.",
            "El PDF nº 2 es la clave oficial corregida publicada como actualizada. No se acredita por ello su firmeza administrativa ni la inexistencia de anulaciones posteriores.",
            "Las reservas se cotejan y conservan inactivas; no aumentan el denominador de 100 preguntas ordinarias.",
            "Las frecuencias documentales describen los enunciados ordinarios verificados que se publicaron. La corrección definitiva de simulacros y la evaluación estricta requieren clave final acreditada.",
        ],
    }
    target = ROOT / "data/verified/2026-documentary.json"
    target.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {
                "artifact": str(target.relative_to(ROOT)),
                "sha256": sha(target),
                "ordinary": 100,
                "reserves": 5,
                "modelRecords": 210,
                "pairs": 105,
                "corrections": artifact["corrections"],
                "administrativeFinalityConfirmed": False,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    run()
