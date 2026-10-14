#!/usr/bin/env python3
"""Versioned assisted audit. Explicit blind proposals are evidence, never human validation.
No wording-derived confidence; flags prioritize review and do not estimate accuracy.
"""
import csv, hashlib, json, re, unicodedata
from pathlib import Path
from collections import defaultdict, Counter
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/verified/quality-audit-700'
def sha(b): return hashlib.sha256(b).hexdigest()
def dump(x): return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def clean(x): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',x)).strip()
def write(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def canonical_inputs():
    result=[]
    for m in json.loads((ROOT/'data/verified/2026-documentary.json').read_text())['models'][:1]:
        for q in m['questions']:
            if not q['reserve']:result.append(dict(identity=f'2026-A-{q["number"]}',year=2026,session='2026-07-11',model='A',**q))
    for f in json.loads((ROOT/'data/verified/history/bank.json').read_text())['forms']:
        m=f['models'][0]
        for q in m['questions']:
            if not q['reserve']:
                result.append({k:v for k,v in dict(q,identity=f'{f["year"]}-{m["model"]}-{q["number"]}',year=f['year'],session=f['session'],model=m['model']).items() if k!='classification'})
    fields=['identity','year','session','model','number','stem','options','correct','sourcePage']
    return sorted([{k:q[k] for k in fields} for q in result],key=lambda q:q['identity'])
def fingerprint(q):return sha(dump([q['year'],q['session'],q['model'],q['number'],clean(q['stem']),[clean(o) for o in q['options']],q['correct']]).encode())
def run():
    OUT.mkdir(parents=True,exist_ok=True)
    blind=canonical_inputs()
    proposal_path=ROOT/'data/curation/audit-blind-rules.json'
    if not proposal_path.exists(): raise SystemExit('Falta el paquete privado de auditoría: consulta docs/auditoria-700.md. No se inventan etiquetas para sustituirlo.')
    proposals=json.loads(proposal_path.read_text())
    assert len(blind)==700 and {q['identity'] for q in blind}==set(proposals)
    # The blind artifact has no original concept, confidence, or classification fields.
    write(OUT/'blind-input.json',{'schemaVersion':1,'questions':blind,'excludedFields':['concept','subconcept','confidence','conceptReview','classification'],'limitation':'Mismo asistente, pasada separada con etiquetas ocultas en la entrada. No es un segundo revisor humano ni independencia entre modelos.'})
    old=json.loads((ROOT/'data/verified/concepts-2023-2026/review.json').read_text())
    original={q['identity']:q for q in old['questions']}
    old_groups=defaultdict(list);new_groups=defaultdict(list)
    for q in blind:
        old_groups[original[q['identity']]['concept']].append(q['identity']);new_groups[proposals[q['identity']]['rule']].append(q['identity'])
    # Hash-sorted sample is reproducible across Python versions, no reliance on legacy confidence as truth.
    sample=sorted([q['identity'] for q in blind if original[q['identity']]['confidence']!='medium'],key=lambda i:sha(('gc-audit-2027-v1|'+i).encode()))[:80]
    references_path=OUT/'legal-evidence.json'
    referenced={r['identity'] for r in json.loads(references_path.read_text())['references']} if references_path.exists() else set()
    rows=[]
    for q in blind:
        id=q['identity'];o=original[id];p=proposals[id]
        assert fingerprint(q)==o['contentSha256']
        neg=bool(re.search(r'INCORRECT[AO]|\bNO\b|no podrá',q['stem']))
        generic=bool(re.search(r'(señale|indique).{0,30}(opción|proposición|respuesta)',q['stem'],re.I))
        flags=[]
        group_rules={proposals[i]['rule'] for i in old_groups[o['concept']]}
        old_names={original[i]['concept'] for i in new_groups[p['rule']]}
        if len(group_rules)>1:flags.append('previous_family_contains_different_rules')
        if len(old_names)>1:flags.append('equivalent_focus_under_different_previous_labels')
        if neg:flags.append('negative_or_exception_question')
        if generic:flags.append('option_focus_requires_full_item_review')
        if id not in referenced and o['normStatus'] not in ['article_checked_as_of_exam','no_specific_norm_established']:flags.append('article_or_historical_version_pending')
        if o['subconcept'] in [o['concept'],o.get('previousConcept')]:flags.append('previous_subaspect_not_specific')
        if id=='2024-2A-81':flags.append('documented_key_law_conflict')
        if id=='2025-A-9':flags.append('possible_treaty_committee_wording_conflict')
        # Expose broad families without using membership in the same norm/article as equivalence.
        rule=p['rule'];rid='rule-'+sha(rule.encode())[:20]
        matter=o['norm'] or o['subject']
        sub=o['subconcept']
        if 'previous_subaspect_not_specific' in flags:
            sub=p.get('subaspect') or rule
        if id=='2024-3A-12':sub='Excepción de indemnizaciones por razón del servicio frente a ausencia absoluta de retribución'
        if id=='2025-A-13':sub='Naturaleza de cooperación técnica y jurídica del Consejo Asesor'
        risk=(100 if 'documented_key_law_conflict' in flags else 0)+(40 if 'possible_treaty_committee_wording_conflict' in flags else 0)+20*('previous_family_contains_different_rules' in flags)+15*neg+15*generic+10*('article_or_historical_version_pending' in flags)+10*('previous_subaspect_not_specific' in flags)
        reasons=[]
        if len(group_rules)>1:reasons.append('La familia anterior agrupa '+str(len(group_rules))+' focos de regla distintos: se separan para no confundir recurrencia de materia con repetición de regla.')
        if len(old_names)>1:reasons.append('El mismo foco se encuentra bajo distintas etiquetas anteriores; se unifica como propuesta asistida.')
        if neg:reasons.append('La opción de clave satisface una consigna negativa o de excepción; su literal no se afirma como verdad jurídica.')
        if generic:reasons.append('La etiqueta identifica el foco señalado por la clave; no acredita que las otras tres alternativas examinen la misma regla.')
        if not reasons:reasons.append('Nueva formulación del foco examinable a partir de enunciado y alternativa de clave; correspondencia completa pendiente de revisión manual.')
        rows.append({'identity':id,'contentSha256':fingerprint(q),'previousConcept':o['concept'],'previousSubconcept':o['subconcept'],'legacyConfidence':o['confidence'],'proposedTopicNumber':p['topicNumber'],'matter':matter,'matterId':'matter-'+sha(matter.encode())[:20],'rule':rule,'ruleId':rid,'subaspect':sub,'subaspectId':'sub-'+sha((rid+'|'+sub).encode())[:20],'method':'separate_assisted_content_pass','independentHumanReview':False,'status':'assisted_pending_manual','scope':'keyed_option_focus' if generic else 'explicit_stem_focus','polarity':'negative_or_exception' if neg else 'positive','keyedStatementTruthStatus':'not_asserted_as_legal_truth','flags':flags,'risk':risk,'initialManualCohort':o['confidence']=='medium','randomSample':id in sample,'reason':' '.join(reasons),'evidence':{'stem':q['stem'],'keyLetter':chr(65+q['correct']),'keyedStatement':q['options'][q['correct']],'optionsCount':len(q['options']),'allOptionsRetainedIn':'blind-input.json','sourcePage':q['sourcePage']},'checks':{'fourNonEmptyDistinctOptions':len(q['options'])==4 and len({clean(x) for x in q['options']})==4 and all(clean(x) for x in q['options']),'inputBoundToRetainedBank':True,'specificRuleProposed':bool(rule),'proposedTopicMatchesPrevious':p['topicNumber']==o['topicNumber'],'fullSemanticCorrespondence':'manual_pending','sameArticleDoesNotEstablishSameRule':True,'familyComparison':'assisted_not_human','normativeCorrectness':'dated_article_reference_checked_not_final_answer' if id in referenced else 'separate_evidence_required'}})
    rows.sort(key=lambda r:(-r['risk'],not r['initialManualCohort'],not r['randomSample'],r['identity']))
    for i,r in enumerate(rows):r['priorityOrder']=i+1
    write(OUT/'audit.json',{'schemaVersion':1,'id':'quality-audit-700-v1','method':'Separate label-blinded assistant pass followed by explicit reconciliation; automated structural checks over all alternatives. Not an independent human audit.','confidencePolicy':'No se calcula confianza de clasificación. La confianza anterior se conserva sólo como dato histórico; el riesgo ordena trabajo, no mide exactitud.','sample':{'seed':'gc-audit-2027-v1','method':'SHA-256(seed|identity), primeras 80 entre las 489 antiguas altas','identities':sample},'criteria':['correspondencia semántica completa','materia frente a regla y subaspecto','misma norma no implica mismo artículo ni misma regla','consistencia de familias','polaridad y alternativas falsas','versión normativa de examen','evidencia documental y conflictos'],'questions':rows})
    write(OUT/'taxonomy-comparison.json',{'previousFamilies':len(old_groups),'newRules':len(new_groups),'matters':len({r['matter'] for r in rows}),'subaspects':len({r['subaspectId'] for r in rows}),'splitFamilies':[{'previousConcept':name,'identities':ids,'rules':sorted({proposals[i]['rule'] for i in ids})} for name,ids in old_groups.items() if len({proposals[i]['rule'] for i in ids})>1],'mergedFocuses':[{'rule':name,'identities':ids,'previousConcepts':sorted({original[i]['concept'] for i in ids})} for name,ids in new_groups.items() if len({original[i]['concept'] for i in ids})>1],'limitations':['No se busca reducir artificialmente el número de reglas. Las familias amplias podían inflar recurrencias.','Reglas propuestas retrospectivamente; no equivalen a anticipación histórica ni a validación humana.','Diferentes subaspectos de un mismo catálogo pueden compartir concepto, pero no se declaran idéntica regla literal.']})
    with (OUT/'manual-review.csv').open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['priority','identity','risk','cohort211','random80','old_concept','proposed_rule','subaspect','flags','decision','reviewer','evidence_url','reason'])
        for r in rows:w.writerow([r['priorityOrder'],r['identity'],r['risk'],r['initialManualCohort'],r['randomSample'],r['previousConcept'],r['rule'],r['subaspect'],','.join(r['flags']),'pending','','',''])
    # Existing original manifests remain immutable. This audit has an independent seal.
    paths=[ROOT/'data/curation/audit-blind-rules.json',*sorted(p for p in OUT.iterdir() if p.name!='manifest.json')]
    write(OUT/'manifest.json',{'schemaVersion':1,'dependencies':{p:sha((ROOT/p).read_bytes()) for p in ['data/verified/concepts-2023-2026/manifest.json','data/verified/history/manifest.json','data/verified/manifest.json']},'files':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p.read_bytes())} for p in paths]})
    print(dump({'reviewed':len(rows),'humanValidated':0,'manualCohort':sum(r['initialManualCohort'] for r in rows),'randomSample':len(sample),'rules':len(new_groups),'matters':len({r['matter'] for r in rows}),'flags':dict(Counter(f for r in rows for f in r['flags']))}))
if __name__=='__main__':run()
