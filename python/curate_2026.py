import csv, json, xml.etree.ElementTree as ET, re, unicodedata, hashlib
from pathlib import Path

norms = {
    "UN": ("Carta de las Naciones Unidas", None),
    "DUDH": ("Declaración Universal de Derechos Humanos", None),
    "CEDH": ("Convenio Europeo de Derechos Humanos", None),
    "CSE": ("Carta Social Europea revisada", None),
    "PIDESC": (
        "Pacto Internacional de Derechos Económicos, Sociales y Culturales",
        None,
    ),
    "PIDCP": ("Pacto Internacional de Derechos Civiles y Políticos", None),
    "RES60": (None, None),
    "OPCAT": ("Protocolo Facultativo de la Convención contra la Tortura", None),
    "CDFUE": ("Carta de los Derechos Fundamentales de la Unión Europea", None),
    "ROMA": ("Estatuto de Roma de la Corte Penal Internacional", None),
    "LO18": (
        "Ley Orgánica 18/2003 · Cooperación con la Corte Penal Internacional",
        "BOE-A-2003-22715",
    ),
    "DEFREG": (
        "Reglamento de Organización y Funcionamiento del Defensor del Pueblo",
        "BOE-A-1983-10613",
    ),
    "LO3EQ": (
        "Ley Orgánica 3/2007 · Igualdad efectiva de mujeres y hombres",
        "BOE-A-2007-6115",
    ),
    "L31": ("Ley 31/1995 · Prevención de Riesgos Laborales", "BOE-A-1995-24292"),
    "RD67": (
        "Real Decreto 67/2010 · Prevención de riesgos laborales en la AGE",
        "BOE-A-2010-2161",
    ),
    "RD179": (
        "Real Decreto 179/2005 · Prevención de riesgos laborales en la Guardia Civil",
        "BOE-A-2005-3241",
    ),
    "CE": ("Constitución Española", "BOE-A-1978-31229"),
    "LODP": ("Ley Orgánica 3/1981 · Defensor del Pueblo", "BOE-A-1981-10325"),
    "LOHONOR": (
        "Ley Orgánica 1/1982 · Honor, intimidad y propia imagen",
        "BOE-A-1982-11196",
    ),
    "TUE": ("Tratado de la Unión Europea", None),
    "TFUE": ("Tratado de Funcionamiento de la Unión Europea", None),
    "CC": ("Código Civil", "BOE-A-1889-4763"),
    "CP": ("Ley Orgánica 10/1995 · Código Penal", "BOE-A-1995-25444"),
    "LEC": ("Ley de Enjuiciamiento Criminal", "BOE-A-1882-6036"),
    "HC": ("Ley Orgánica 6/1984 · Habeas Corpus", "BOE-A-1984-11620"),
    "LOPJ": ("Ley Orgánica 6/1985 · Poder Judicial", "BOE-A-1985-12666"),
    "VICTIM": ("Ley 4/2015 · Estatuto de la víctima del delito", "BOE-A-2015-4606"),
    "L39": ("Ley 39/2015 · Procedimiento Administrativo Común", "BOE-A-2015-10565"),
    "L40": ("Ley 40/2015 · Régimen Jurídico del Sector Público", "BOE-A-2015-10566"),
    "LOPD": (
        "Ley Orgánica 3/2018 · Protección de Datos Personales",
        "BOE-A-2018-16673",
    ),
    "LOEX": (
        "Ley Orgánica 4/2000 · Derechos y libertades de los extranjeros",
        "BOE-A-2000-544",
    ),
    "RD240": (
        "Real Decreto 240/2007 · Libre circulación y residencia de ciudadanos de la Unión",
        "BOE-A-2007-4184",
    ),
    "LOSC": (
        "Ley Orgánica 4/2015 · Protección de la seguridad ciudadana",
        "BOE-A-2015-3442",
    ),
    "LSP": ("Ley 5/2014 · Seguridad Privada", "BOE-A-2014-3649"),
    "RDINT": (
        "Real Decreto 207/2024 · Estructura del Ministerio del Interior",
        "BOE-A-2024-3793",
    ),
    "RDDEF": (
        "Real Decreto 205/2024 · Estructura del Ministerio de Defensa",
        "BOE-A-2024-3791",
    ),
    "LOFCS": (
        "Ley Orgánica 2/1986 · Fuerzas y Cuerpos de Seguridad",
        "BOE-A-1986-6859",
    ),
    "LGC": (
        "Ley 29/2014 · Régimen del Personal de la Guardia Civil",
        "BOE-A-2014-12408",
    ),
    "OGC": (
        "Estructura orgánica de los Servicios Centrales de la Dirección General de la Guardia Civil",
        None,
    ),
    "LOGCDD": (
        "Ley Orgánica 11/2007 · Derechos y deberes de los miembros de la Guardia Civil",
        "BOE-A-2007-18391",
    ),
    "LPC": ("Ley 17/2015 · Sistema Nacional de Protección Civil", "BOE-A-2015-7730"),
    "LPAT": ("Ley 42/2007 · Patrimonio Natural y Biodiversidad", "BOE-A-2007-21490"),
    "LGT": ("Ley 11/2022 · General de Telecomunicaciones", "BOE-A-2022-10757"),
    "LECONF": ("Ley 6/2020 · Servicios electrónicos de confianza", "BOE-A-2020-14046"),
    "ENI": (
        "Real Decreto 4/2010 · Esquema Nacional de Interoperabilidad",
        "BOE-A-2010-1331",
    ),
    "RDCOD": (
        "Real Decreto 176/2022 · Código de Conducta del personal de la Guardia Civil",
        "BOE-A-2022-3477",
    ),
    "PBF": (
        "Principios Básicos sobre el Empleo de la Fuerza y de Armas de Fuego",
        None,
    ),
    "LOMEN": (
        "Ley Orgánica 5/2000 · Responsabilidad penal de los menores",
        "BOE-A-2000-641",
    ),
    "LOGEN": (
        "Ley Orgánica 1/2004 · Medidas contra la violencia de género",
        "BOE-A-2004-21760",
    ),
    "RARMS": ("Real Decreto 137/1993 · Reglamento de Armas", "BOE-A-1993-6202"),
    "REXP": ("Real Decreto 130/2017 · Reglamento de Explosivos", "BOE-A-2017-2313"),
    "LOCON": ("Ley Orgánica 12/1995 · Represión del Contrabando", "BOE-A-1995-26836"),
    "RDCON": (
        "Real Decreto 1649/1998 · Infracciones administrativas de contrabando",
        "BOE-A-1998-21017",
    ),
    "CAU": ("Reglamento (UE) 952/2013 · Código Aduanero de la Unión", None),
}


def normalize(s):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )


def blocks(id):
    p = Path(".local/legal-cache") / (id + ".xml")
    if not p.exists():
        return []
    out = []
    for b in ET.parse(p).getroot().iter("bloque"):
        vs = [
            v
            for v in b.findall("version")
            if v.get("fecha_publicacion", "") <= "20260711"
            and v.get("fecha_vigencia", "") <= "20260711"
        ]
        if not vs:
            continue
        v = max(
            vs,
            key=lambda v: (v.get("fecha_vigencia", ""), v.get("fecha_publicacion", "")),
        )
        body = " ".join(" ".join(v.itertext()).split())
        out.append((b, v, body))
    return out


if __name__ == "__main__":
    import urllib.request

    needed = {
        norms[r["lawCode"]][1]
        for r in csv.DictReader(open("data/verified/2026-curation.tsv"), delimiter="\t")
        if r["article"] and r["lawCode"] in norms and norms[r["lawCode"]][1]
    }
    for id in sorted(needed):
        dest = Path(".local/legal-cache") / (id + ".xml")
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            request = urllib.request.Request(
                f"https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{id}/texto",
                headers={"Accept": "application/xml"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read()
            if not list(ET.fromstring(payload).iter("bloque")):
                raise ValueError("Respuesta primaria sin bloques: " + id)
            dest.write_bytes(payload)
    out = []
    evidence = []
    pending = []
    for row in csv.DictReader(open("data/verified/2026-curation.tsv"), delimiter="\t"):
        n = int(row["number"])
        code = row["lawCode"]
        law, id = norms.get(code, (None, None))
        article = None
        ref = None
        if row["article"] and id:
            wanted = normalize(row["article"])
            found = []
            for b, v, body in blocks(id):
                heading = " ".join(b.get("titulo", "").split()).rstrip(".")
                ordinals = {
                    "primero": "1",
                    "segundo": "2",
                    "tercero": "3",
                    "cuarto": "4",
                    "quinto": "5",
                    "sexto": "6",
                    "séptimo": "7",
                    "octavo": "8",
                    "noveno": "9",
                    "décimo": "10",
                    "cincuenta y cinco": "55",
                    "sesenta y cinco": "65",
                    "ochenta y cuatro": "84",
                }
                heading = (
                    "Artículo " + ordinals[heading.removeprefix("Artículo ")]
                    if heading.removeprefix("Artículo ") in ordinals
                    else heading
                )
                m = re.match(
                    r"(?:Art(?:[ií]culo)?\.?\s*)(\d+(?:\s+(?:bis|ter))?)$",
                    heading,
                    re.I,
                )
                match = (
                    (m and normalize(m[1]) == wanted)
                    or (wanted == "preambulo" and b.get("tipo") == "preambulo")
                    or (
                        wanted == "da primera"
                        and normalize(heading).startswith(
                            "disposicion adicional primera"
                        )
                    )
                )
                if match and normalize(row["anchor"]) in normalize(body):
                    found.append((b, v, body))
            if len(found) == 1 and normalize(row["anchor"]) in normalize(found[0][2]):
                b, v, body = found[0]
                article = row["article"]
                version = v.attrib
                url = f'https://www.boe.es/buscar/act.php?id={id}&p={version["fecha_publicacion"]}&tn=1#{b.get("id")}'
                paragraph = row["paragraph"] or None
                if paragraph:
                    active = False
                    parts = []
                    for node in v.findall(".//p"):
                        line = " ".join(" ".join(node.itertext()).split())
                        section = re.match(r"^(\d+)\.\s", line)
                        if section:
                            active = section[1] == paragraph
                        if active:
                            parts.append(line)
                    if normalize(row["anchor"]) not in normalize(" ".join(parts)):
                        pending.append(
                            {
                                "number": n,
                                "reason": "Apartado no cotejado; se mantiene sólo el artículo",
                                "proposedParagraph": paragraph,
                            }
                        )
                        paragraph = None
                ref = {
                    "id": f"ref-2026-{n}",
                    "questionNumberA": n,
                    "lawId": id,
                    "article": article,
                    "paragraph": paragraph,
                    "blockId": b.get("id"),
                    "url": url,
                    "apiUrl": f'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{id}/texto/bloque/{b.get("id")}',
                    "version": version,
                    "checkedAsOf": "2026-07-11",
                    "anchor": row["anchor"],
                    "text": body,
                    "documentSha256": hashlib.sha256(
                        (Path(".local/legal-cache") / (id + ".xml")).read_bytes()
                    ).hexdigest(),
                }
                evidence.append(ref)
            else:
                pending.append(
                    {
                        "number": n,
                        "proposedArticle": row["article"],
                        "lawId": id,
                        "found": len(found),
                        "reason": (
                            "anchor absent or ambiguous"
                            if found
                            else "block not located"
                        ),
                    }
                )
        out.append(
            {
                "number": n,
                "topicNumber": int(row["topic"]),
                "concept": row["concept"],
                "law": law,
                "lawId": id,
                "lawVerified": bool(law) and code != "RES60",
                "lawVerificationBasis": (
                    "literal_heading_and_identified_norm"
                    if law
                    else (
                        "pending_primary_norm_verification"
                        if code == "RES60"
                        else "not_applicable_non_legal_subject"
                    )
                ),
                "article": article,
                "paragraph": ref["paragraph"] if ref else None,
                "legalUrl": ref["url"] if ref else None,
                "legalVerified": bool(ref),
                "legalEvidenceId": ref["id"] if ref else None,
                "classificationMethod": "curated_from_official_question_and_syllabus",
                "classificationReviewed": True,
            }
        )
    assert len(out) == 105
    Path("data/verified/2026-classification.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "scope": "2026-07-11",
                "syllabusSourceId": "syllabus-linked-2026",
                "questions": out,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    Path("data/verified/2026-legal-evidence.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "checkedAsOf": "2026-07-11",
                "notes": "Texto consolidado BOE de carácter informativo, con selección de versiones por publicación y vigencia anteriores al examen; no certifica vigencia actual ni firmeza de respuestas. El preámbulo y las disposiciones adicionales se identifican expresamente como tales.",
                "references": evidence,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    Path(".local/legal-cache/pending.json").write_text(
        json.dumps(pending, ensure_ascii=False, indent=2)
    )
    print(
        "Classification:",
        len(out),
        "Article evidence:",
        len(evidence),
        "Pending:",
        json.dumps(pending, ensure_ascii=False),
    )
