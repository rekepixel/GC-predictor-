#!/usr/bin/env python3
"""Seal explicit concept annotations against the existing retained exam evidence.
No AI/network call or inferred legal article. The supplied labels are assistant
content reviews; independent human review and answer finality remain separate.
"""

import csv, hashlib, json, re, unicodedata
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/verified/concepts-2023-2026"


def dump(x):
    return json.dumps(x, ensure_ascii=False, separators=(",", ":"))


def sha(b):
    return hashlib.sha256(b).hexdigest()


def clean(x):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", x)).strip()


def fingerprint(y, s, m, n, q):
    return sha(
        dump(
            [
                y,
                s,
                m,
                n,
                clean(q["stem"]),
                [clean(o) for o in q["options"]],
                q["correct"],
            ]
        ).encode()
    )


SUBJECTS = {
    1: "Protección internacional de los derechos humanos",
    2: "Igualdad y no discriminación por razón de sexo",
    3: "Seguridad y salud en el trabajo",
    4: "Organización constitucional y garantías de derechos",
    5: "Ordenamiento e instituciones de la Unión Europea",
    6: "Organizaciones y cooperación internacionales",
    7: "Persona, familia y fuentes del Derecho civil",
    8: "Teoría del delito, penas y figuras delictivas",
    9: "Procedimiento penal y organización judicial",
    10: "Procedimiento y organización administrativa",
    11: "Protección de datos personales y autoridades de control",
    12: "Régimen jurídico de extranjeros y ciudadanos de la Unión",
    13: "Seguridad ciudadana y servicios de seguridad privada",
    14: "Organización ministerial de Interior y Defensa",
    15: "Organización, estatuto e historia de la Guardia Civil",
    16: "Protección civil y conservación del patrimonio natural",
    17: "Telecomunicaciones, administración electrónica y ciberseguridad",
    18: "Medición y representación topográfica",
    19: "Deontología y empleo policial de la fuerza",
    20: "Sistema de responsabilidad penal de menores",
    21: "Prevención y protección frente a la violencia de género",
    22: "Control administrativo de armas y explosivos",
    23: "Contrabando y régimen aduanero",
}


def run():
    annotations = list(
        csv.DictReader(open(ROOT / "data/curation/concepts-700.psv"), delimiter="|")
    )
    assert len(annotations) == 524 and len({r["identity"] for r in annotations}) == 524
    explicit = {r["identity"]: r for r in annotations}
    original = json.load(open(ROOT / "data/verified/2026-classification.json"))[
        "questions"
    ]
    doc = json.load(open(ROOT / "data/verified/2026-documentary.json"))
    manual = json.load(open(ROOT / "data/verified/history/manual-concepts.json"))
    old = {str(c["number"]): c for c in original}
    items = []
    for q in doc["models"][0]["questions"]:
        if q["reserve"]:
            continue
        c = dict(old[str(q["number"])])
        identity = f'2026-A-{q["number"]}'
        baseline = c["concept"]
        if identity in manual:
            c["concept"] = manual[identity]["concept"]
        items.append((identity, 2026, "2026-07-11", "A", q, c, baseline))
    history = json.load(open(ROOT / "data/verified/history/bank.json"))
    for f in history["forms"]:
        m = f["models"][0]
        for q in m["questions"]:
            if not q["reserve"]:
                items.append(
                    (
                        f'{f["year"]}-{m["model"]}-{q["number"]}',
                        f["year"],
                        f["session"],
                        m["model"],
                        q,
                        q["classification"],
                        q["classification"].get("concept"),
                    )
                )
    assert len(items) == 700 and len({i[0] for i in items}) == 700
    assert {i[0] for i in items if not i[5].get("concept")} == set(explicit)
    reviewed = []
    for identity, year, session, model, q, c, baseline in items:
        a = explicit.get(identity)
        concept = a["concept"] if a else c["concept"]
        subconcept = a["subconcept"] if a else baseline or concept
        assert concept and subconcept and len(concept) < 300 and len(subconcept) < 500
        topic = c.get("topicNumber")
        if topic is None:
            topic = int(str(c["topicId"]).split("-")[-1])
        norm_status = (
            "historical_version_pending"
            if "versión histórica por identificar" in (c.get("law") or "")
            else (
                "article_checked_as_of_exam"
                if c.get("legalVerified")
                else (
                    "norm_named_in_question"
                    if c.get("law")
                    else "no_specific_norm_established"
                )
            )
        )
        scope = (
            "keyed_statement_focus"
            if re.search(r"señale|indique la|proposición|proposici.n", q["stem"], re.I)
            else "focused"
        )
        reviewed.append(
            {
                "identity": identity,
                "year": year,
                "session": session,
                "model": model,
                "number": q["number"],
                "contentSha256": fingerprint(year, session, model, q["number"], q),
                "topicNumber": topic,
                "subject": SUBJECTS[topic],
                "concept": concept,
                "subconcept": subconcept,
                "norm": c.get("law"),
                "normStatus": norm_status,
                "previousConcept": c.get("concept"),
                "previousSubaspect": baseline,
                "newConceptAssignment": bool(a),
                "method": (
                    "assistant_content_review" if a else "preserved_previous_curation"
                ),
                "confidence": "medium" if scope == "keyed_statement_focus" else "high",
                "scope": scope,
                "independentHumanReview": False,
                "evidence": {
                    "stem": q["stem"],
                    "keyedStatement": q["options"][q["correct"]],
                    "sourcePage": q["sourcePage"],
                },
                "limitations": [
                    "Confianza cualitativa de clasificación, no calibrada.",
                    "La alternativa de clave puede ser una proposición falsa en preguntas negativas: no es una explicación jurídica.",
                    "La familia conceptual puede contener reglas distintas; consultar el subconcepto y el original.",
                ],
            }
        )
    result = {
        "schemaVersion": 1,
        "id": "gc-concepts-700-v1",
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "reviewer": "software_assistant",
        "independentHumanReview": False,
        "coverage": {
            "ordinary": 700,
            "newAssignments": 524,
            "previousAssignmentsPreserved": 176,
            "reservesIncluded": 0,
        },
        "source": "data/curation/concepts-700.psv",
        "questions": sorted(reviewed, key=lambda r: r["identity"]),
        "limitations": [
            "Taxonomía asistida y retrospectiva: no equivale a doble revisión humana ni valida respuestas finales.",
            "La norma se conserva de la clasificación anterior; no se infieren artículos nuevos a partir del nombre conceptual.",
            "Las referencias históricas verificadas siguen ligadas a sus versiones de examen, no certifican vigencia 2027.",
        ],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "review.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    paths = [
        ROOT / "data/curation/concepts-700.psv",
        ROOT / "data/curation/concept-relations.json",
        *(p for p in OUT.iterdir() if p.name != "manifest.json"),
    ]
    manifest = {
        "schemaVersion": 1,
        "files": [
            {"path": str(p.relative_to(ROOT)), "sha256": sha(p.read_bytes())}
            for p in sorted(paths)
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        dump(
            {
                "ordinary": 700,
                "newAssignments": 524,
                "preserved": 176,
                "families": len({q["concept"] for q in reviewed}),
                "confidenceMedium": sum(q["confidence"] == "medium" for q in reviewed),
            }
        )
    )


if __name__ == "__main__":
    raise SystemExit("Script histórico congelado: su confianza por redacción fue retirada. Usa curate_concepts.py; no se sobrescribe la evidencia original.")
