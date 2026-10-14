#!/usr/bin/env python3
"""Reviewed heading rules assign programme topics. Concepts/articles need explicit curation.
Candidate BOE block matches are proposals only; they never become verified references here.
"""

import json, re, unicodedata, xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path
from curate_2026 import norms

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/verified/history"


def normal(s):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", s.casefold())
        if unicodedata.category(c) != "Mn"
    )


def words(s):
    return re.findall(r"[a-z0-9]+", normal(s))


# Longest/specific titles precede general ones. Each rule refers to an explicit question heading.
RULES = [
    (r"^carta de las naciones", "UN", 1),
    (r"^declaracion universal", "DUDH", 1),
    (r"^convenio para la proteccion", "CEDH", 1),
    (r"^carta social", "CSE", 1),
    (r"^pacto internacional de derechos economicos", "PIDESC", 1),
    (r"^pacto internacional de derechos civiles", "PIDCP", 1),
    (r"^consejo de derechos humanos", "RES60", 1),
    (r"^protocolo facultativo", "OPCAT", 1),
    (r"^convencion contra la tortura", "CAT", 1),
    (r"^carta de (?:los )?derechos fundamentales", "CDFUE", 1),
    (r"^estatuto de roma", "ROMA", 1),
    (r"^ley organica de cooperacion", "LO18", 1),
    (r"^reglamento de organizacion y funcionamiento del defensor", "DEFREG", 1),
    (r"^ley organica para la igualdad", "LO3EQ", 2),
    (r"^ley de prevencion", "L31", 3),
    (r"^real decreto de adaptacion", "RD67", 3),
    (r"^real decreto sobre prevencion", "RD179", 3),
    (r"^constitucion", "CE", 4),
    (r"^ley organica del defensor", "LODP", 4),
    (r"^ley organica sobre proteccion civil del derecho", "LOHONOR", 4),
    (r"^tratado de la union", "TUE", 5),
    (r"^tratado de funcionamiento", "TFUE", 5),
    (r"^instituciones internacionales", None, 6),
    (r"^codigo civil", "CC", 7),
    (r"^ley organica del codigo penal", "CP", 8),
    (r"^ley de enjuiciamiento", "LEC", 9),
    (r"^ley organica reguladora del procedimiento de habeas", "HC", 9),
    (r"^ley organica del poder judicial", "LOPJ", 9),
    (r"^ley del estatuto de la victima", "VICTIM", 9),
    (r"^real decreto sobre regulacion de la policia judicial", "POLJUD", 9),
    (r"^ley del procedimiento administrativo", "L39", 10),
    (r"^ley (?:del? )?regimen juridico del sector publico", "L40", 10),
    (r"^ley organica de proteccion.*datos", "LOPD", 11),
    (r"^ley organica (?:4/2000 )?sobre derechos y libertades", "LOEX", 12),
    (r"^real decreto sobre entrada", "RD240", 12),
    (r"^ley organica de proteccion de la seguridad ciudadana", "LOSC", 13),
    (r"^ley de seguridad privada", "LSP", 13),
    (
        r"^real decreto por el que se desarrolla la estructura organica basica del ministerio del interior",
        "RDINT",
        14,
    ),
    (
        r"^real decreto por el que se desarrolla la estructura organica basica del ministerio de defensa",
        "RDDEF",
        14,
    ),
    (r"^ley organica de fuerzas", "LOFCS", 15),
    (r"^ley de regimen del personal", "LGC", 15),
    (r"^estructura organica de los servicios", "OGC", 15),
    (r"^historia de la guardia", None, 15),
    (r"^ley organica reguladora de los derechos y deberes", "LOGCDD", 15),
    (r"^ley del sistema nacional", "LPC", 16),
    (r"^ley del patrimonio", "LPAT", 16),
    (r"^ley general de telecomunicaciones", "LGT", 17),
    (r"^real decreto por el que se regula el esquema", "ENI", 17),
    (r"^ley reguladora de determinados aspectos", "LECONF", 17),
    (r"^principios y recomendaciones basicas en ciberseguridad", None, 17),
    (r"^real decreto sobre organizacion e instrumentos operativos", "TICAGE", 17),
    (r"^topografia", None, 18),
    (r"^real decreto por el que se aprueba el codigo de conducta", "RDCOD", 19),
    (r"^principios basicos sobre el empleo", "PBF", 19),
    (r"^ley organica reguladora de la responsabilidad", "LOMEN", 20),
    (r"^ley organica de medidas de proteccion", "LOGEN", 21),
    (r"^reglamento de armas", "RARMS", 22),
    (r"^reglamento de explosivos", "REXP", 22),
    (r"^ley organica de represion", "LOCON", 23),
    (r"^real decreto.*contrabando", "RDCON", 23),
    (
        r"^(?:reglamento por el que se establece el codigo aduanero|codigo aduanero)",
        "CAU",
        23,
    ),
]
EXTRA = {
    "CAT": ("Convención contra la Tortura", None),
    "POLJUD": ("Real Decreto de regulación de la Policía Judicial", None),
    "TICAGE": ("Real Decreto de organización de las TIC en la AGE", None),
}


@lru_cache(maxsize=200)
def blocks(law_id, day):
    path = ROOT / ".local/legal-cache" / f"{law_id}.xml"
    if not path.exists():
        return []
    out = []
    for block in ET.parse(path).getroot().iter("bloque"):
        versions = [
            v
            for v in block.findall("version")
            if v.get("fecha_publicacion", "") <= day
            and v.get("fecha_vigencia", "") <= day
        ]
        if not versions:
            continue
        v = max(
            versions,
            key=lambda v: (v.get("fecha_vigencia", ""), v.get("fecha_publicacion", "")),
        )
        out.append((block, v, " ".join(v.itertext())))
    return out


def run():
    config = json.loads((BASE / "config.json").read_text())
    keys = json.loads((BASE / "key-transcriptions.json").read_text())
    manual = (
        json.loads((BASE / "manual-concepts.json").read_text())
        if (BASE / "manual-concepts.json").exists()
        else {}
    )
    existing = json.loads(
        (ROOT / "data/verified/2026-classification.json").read_text()
    )["questions"]
    literal2026 = json.loads(
        (ROOT / "data/verified/2026-documentary.json").read_text()
    )["models"][0]["questions"]
    n = lambda s: re.sub(r"\s+", "", s)
    old_lit = {
        (n(q["stem"]), tuple(sorted(map(n, q["options"])))): c
        for q, c in zip(literal2026, existing)
    }
    output = {}
    proposals = []
    unmatched = []
    for form in config["forms"]:
        y, f = form["year"], form["form"]
        model = f + "A"
        day = form["session"].replace("-", "")
        qs = json.loads(
            (
                ROOT / f".local/history-research/extracted/{y}-{model}-plumber.json"
            ).read_text()
        )["questions"]
        matrix = [r.split() for r in keys["matrices"][f"{y}-{model}"]]
        for q in qs:
            identity = f'{y}-{model}-{q["number"]}'
            stem = re.sub(r"\s+", " ", q["stem"])
            heading = stem.split(". ")[0]
            rules = [
                (code, topic, pattern)
                for pattern, code, topic in RULES
                if re.search(pattern, normal(heading))
            ]
            if len(rules) != 1:
                unmatched.append((identity, heading))
                continue
            code, topic, pattern = rules[0]
            law, law_id = norms.get(code, EXTRA.get(code, (None, None)))
            if code == "RES60":
                law = heading
                law_id = None
            if code in ["RDINT", "RDDEF"] and y == 2023:
                law = heading + " · versión histórica por identificar"
                law_id = None
            c = {
                "topicNumber": topic,
                "lawCode": code,
                "law": law,
                "lawId": None,
                "lawVerified": bool(law),
                "classificationMethod": "reviewed_heading_to_programme_2026",
                "classificationReviewed": True,
                "confidence": 0.99,
                "classificationEvidence": heading,
                "concept": None,
                "conceptId": None,
                "article": None,
                "paragraph": None,
                "legalUrl": None,
                "legalVerified": False,
                "legalEvidenceId": None,
                "curriculumStatus": "topic_in_reference_programme; individual_content_not_certified",
            }
            literal = old_lit.get((n(q["stem"]), tuple(sorted(map(n, q["options"])))))
            if literal:
                c.update(
                    {
                        k: literal.get(k)
                        for k in [
                            "concept",
                            "article",
                            "paragraph",
                            "legalUrl",
                            "legalVerified",
                            "lawId",
                            "legalEvidenceId",
                        ]
                    }
                )
                c["conceptId"] = f'concept-2026-{literal["number"]}'
                c["conceptEvidence"] = (
                    "Identidad literal de enunciado y cuatro opciones con la pregunta 2026 A"
                    + str(literal["number"])
                )
            if identity in manual:
                if manual[identity].get("concept") != c["concept"]:
                    c["conceptId"] = None
                c.update(manual[identity])
                c["conceptEvidence"] = (
                    "Revisión específica del contenido de esta pregunta; enlace explícito en manual-concepts.json"
                )
            output[identity] = c
            if not law_id or q["reserve"]:
                continue
            candidates = []
            for b, v, text in blocks(law_id, day):
                if b.get("tipo") != "precepto":
                    continue
                body = " " + " ".join(words(text)) + " "
                anchors = []
                for option in q["options"]:
                    tokens = words(option)
                    if len(tokens) >= 14:
                        for i in range(max(1, len(tokens) - 13)):
                            anchor = " ".join(tokens[i : i + 14])
                            if len(anchor) >= 70 and " " + anchor + " " in body:
                                anchors.append(anchor)
                if anchors:
                    candidates.append(
                        (
                            len(set(anchors)),
                            b.get("id"),
                            b.get("titulo"),
                            max(anchors, key=len),
                            v.attrib,
                        )
                    )
            candidates.sort(reverse=True)
            if (
                candidates
                and candidates[0][0] >= 3
                and (len(candidates) == 1 or candidates[0][0] > 2 * candidates[1][0])
            ):
                score, block, title, anchor, version = candidates[0]
                proposals.append(
                    {
                        "questionId": identity,
                        "lawId": law_id,
                        "title": title,
                        "blockId": block,
                        "anchor": anchor,
                        "score": score,
                        "version": version,
                        "stem": stem,
                        "concept": c["concept"],
                    }
                )
    assert not unmatched, unmatched
    (BASE / "curation.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    )
    (BASE / "heading-rules.json").write_text(
        json.dumps(
            {
                "basis": "Explicit question heading to official 2026 topic titles; no retroactive claim about syllabus dates.",
                "rules": [
                    {"pattern": p, "lawCode": c, "topic": t} for p, c, t in RULES
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    p = ROOT / ".local/history-research/legal-proposals.json"
    p.write_text(json.dumps(proposals, ensure_ascii=False, indent=2) + "\n")
    print(
        "Classified",
        len(output),
        "explicit concepts",
        sum(bool(c["concept"]) for c in output.values()),
        "BOE candidates pending review",
        len(proposals),
    )
    for c in proposals:
        print(c["questionId"], c["lawId"], c["title"], c["score"], c["stem"][:105])


if __name__ == "__main__":
    run()
