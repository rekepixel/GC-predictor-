"""Prepare source-bound draft candidates; never certifies semantic/legal correctness.
Requires the complete private historical DB and retained current BOE snapshots.
All outputs stay in data/generated (ignored by Git). No historical question is copied.
"""
import pathlib,json,sqlite3,re,hashlib,unicodedata
from collections import Counter
ROOT=pathlib.Path('data/generated/2027-v1')
NORMS=[
(1,'BOE-A-2003-22715','Ley Orgánica 18/2003, de Cooperación con la Corte Penal Internacional',[1,2,3],1),
(1,'BOE-A-1983-10613','Reglamento de Organización y Funcionamiento del Defensor del Pueblo',[19,20,21],1),
(2,'BOE-A-2007-6115','Ley Orgánica 3/2007, para la igualdad efectiva de mujeres y hombres',[3,6,7],1),
(3,'BOE-A-1995-24292','Ley 31/1995, de Prevención de Riesgos Laborales',[14,15,16],2),
(4,'BOE-A-1978-31229','Constitución Española',[72,81,87],2),
(4,'BOE-A-1981-10325','Ley Orgánica 3/1981, del Defensor del Pueblo',[1,2,3],2),
(7,'BOE-A-1889-4763','Código Civil',[17,18,20],3),
(8,'BOE-A-1995-25444','Ley Orgánica 10/1995, del Código Penal',[1,4,5],3),
(9,'BOE-A-1882-6036','Ley de Enjuiciamiento Criminal',[118,282,520],4),
(9,'BOE-A-1984-11620','Ley Orgánica 6/1984, reguladora del procedimiento de Habeas Corpus',[1,2,3],4),
(9,'BOE-A-1985-12666','Ley Orgánica 6/1985, del Poder Judicial',[547,548,549],4),
(10,'BOE-A-2015-10565','Ley 39/2015, del Procedimiento Administrativo Común',[21,30,40],4),
(10,'BOE-A-2015-10566','Ley 40/2015, de Régimen Jurídico del Sector Público',[23,24,29],5),
(11,'BOE-A-2018-16673','Ley Orgánica 3/2018, de Protección de Datos Personales',[5,6,8],5),
(12,'BOE-A-2000-544','Ley Orgánica 4/2000, sobre derechos y libertades de los extranjeros',[3,4,5],5),
(12,'BOE-A-2007-4184','Real Decreto 240/2007, sobre ciudadanos de la Unión Europea',[4,6,7],5),
(13,'BOE-A-2015-3442','Ley Orgánica 4/2015, de protección de la seguridad ciudadana',[8,9,16],5),
(13,'BOE-A-2014-3649','Ley 5/2014, de Seguridad Privada',[8,9,10],5),
(14,'BOE-A-2024-3793','Real Decreto 207/2024, estructura del Ministerio del Interior',[1,2,3],5),
(14,'BOE-A-2024-3791','Real Decreto 205/2024, estructura del Ministerio de Defensa',[1,2,3],5),
(15,'BOE-A-1986-6859','Ley Orgánica 2/1986, de Fuerzas y Cuerpos de Seguridad',[5,9,11],5),
(15,'BOE-A-2014-12408','Ley 29/2014, de Régimen del Personal de la Guardia Civil',[4,8,9],5),
(15,'BOE-A-2007-18391','Ley Orgánica 11/2007, derechos y deberes de la Guardia Civil',[3,7,8],6),
(16,'BOE-A-2015-7730','Ley 17/2015, del Sistema Nacional de Protección Civil',[3,4,5],6),
(16,'BOE-A-2007-21490','Ley 42/2007, del Patrimonio Natural y de la Biodiversidad',[29,30,31],6),
(17,'BOE-A-2022-10757','Ley 11/2022, General de Telecomunicaciones',[1,2,3],6),
(17,'BOE-A-2020-14046','Ley 6/2020, servicios electrónicos de confianza',[1,2,3],6),
(17,'BOE-A-2010-1331','Real Decreto 4/2010, Esquema Nacional de Interoperabilidad',[4,5,6],7),
(19,'BOE-A-2022-3477','Real Decreto 176/2022, código de conducta de la Guardia Civil',[1,2,3],7),
(20,'BOE-A-2000-641','Ley Orgánica 5/2000, responsabilidad penal de los menores',[1,3,6],7),
(21,'BOE-A-2004-21760','Ley Orgánica 1/2004, protección integral contra la violencia de género',[1,2,3],7),
(22,'BOE-A-1993-6202','Real Decreto 137/1993, Reglamento de Armas',[1,2,3],7),
(22,'BOE-A-2017-2313','Real Decreto 130/2017, Reglamento de Explosivos',[1,2,3],7),
(23,'BOE-A-1995-26836','Ley Orgánica 12/1995, de represión del contrabando',[1,2,3],7),
(23,'BOE-A-1998-21017','Real Decreto 1649/1998, infracciones administrativas de contrabando',[1,2,3],7),
]
manifest={row['id']:row for row in json.load(open(ROOT/'source-manifest.json'))}
c=sqlite3.connect('file:.local/gc-predictor.sqlite?mode=ro',uri=True)
history=[json.loads(x[0]) for x in c.execute('SELECT payload FROM questions')]
if len(history)!=2100 or not pathlib.Path('data/verified/quality-audit-700/manifest.json').exists():raise RuntimeError('Requires complete private bank and audit; public repository alone is not a replacement.')
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if not unicodedata.combining(c))
def date(s):return s[:4]+'-'+s[4:6]+'-'+s[6:8]
rows=[];skipped=[]
for topic,lawId,law,articles,page in NORMS:
 blocks=json.load(open(ROOT/(lawId+'.selected.json')))
 for article in articles:
  # Supports BOE's a1, art1, and annex article labels; never invent an absent locator.
  block=next((b for b in blocks if re.match(r'^art[ií]culo\s*'+str(article)+r'(?:\.|\s|$)',re.sub(r'\s+',' ',b['text']).strip(),re.I)),None)
  if not block:skipped.append([lawId,article,'article not found']);continue
  full=re.sub(r'\s+',' ',block['text']).strip()
  body=re.sub(r'^Art[ií]culo\s*\d+[.\s]*','',full,flags=re.I)
  body=re.split(r' Se (?:modifica|añade|suprime|renumera)',body)[0].strip()
  # Candidate only: the context and its distractors still need semantic review.
  clauses=[v.strip() for v in re.split(r'(?<=[.;])\s+',body) if 80<len(v.strip())<650 and 'Ref.'not in v]
  if not clauses:clauses=[body[:650].strip()]
  sentence=clauses[0];words=sentence.rstrip('.;').split()
  if len(words)<10:skipped.append([lawId,article,'too short']);continue
  gap=' '.join(words[-6:]);prefix=' '.join(words[:-6:])
  alternatives=[]
  for other in blocks:
   if other['id']==block['id']:continue
   t=re.sub(r'\s+',' ',other['text']).strip();w=t.rstrip('.;').split()
   if len(w)>15 and 'Artículo'in t[:40]:
    choice=' '.join(w[-6:])
    if choice!=gap and choice not in alternatives and 'BOE-'not in choice and 'Ref.'not in choice:alternatives.append(choice)
   if len(alternatives)==3:break
  if len(alternatives)<3:skipped.append([lawId,article,'insufficient candidate distractors']);continue
  refs=[q['id'] for q in history if q['year']>=2023 and not q['reserve'] and q.get('documentaryVerification') and q['model'].endswith('A') and q.get('topicId')==f'tema-{topic:02d}'][:3]
  version=block['version'];sha=hashlib.sha256((lawId+'|'+block['id']+'|'+sentence).encode()).hexdigest()
  rows.append({'id':'gen-draft-'+sha[:24],'stem':f'{law}. Complete el siguiente fragmento del artículo {article}: «{prefix} ______».','options':[gap,*alternatives],'correct':0,'topicId':f'tema-{topic:02d}','concept':block['title']or f'Contenido del artículo {article}','conceptId':'generated-rule-'+hashlib.sha256((lawId+'|'+block['id']).encode()).hexdigest()[:20],'subaspect':lawId+'|'+block['id']+'|literal-draft','law':law,'article':str(article),'paragraph':None,'explanation':f'Fragmento documental del artículo {article}: {sentence} La selección de distractores está pendiente de revisión semántica; no utilizar todavía para corregir un simulacro.','referenceDate':'2026-10-15','historicalReferences':refs,'format':'statement','difficulty':'medium','evidence':[{'url':f'https://www.boe.es/buscar/act.php?id={lawId}&p={version["fecha_publicacion"]}&tn=1#{block["id"]}','sha256':manifest[lawId]['sha256'],'storageKey':manifest[lawId]['storageKey'],'quote':full,'publishedAt':date(version['fecha_publicacion']),'effectiveFrom':date(version['fecha_vigencia']),'checkedAsOf':'2026-10-15','syllabusQuote':law.split(',')[0],'syllabusPage':page}],'optionChecks':[],'quality':{'state':'draft','method':'source_bound_literal_candidate_not_semantically_validated','humanReviewed':False,'issues':['Contrastar la unicidad de la respuesta y la falsedad contextual de tres distractores.','Revisar inclusión exacta del apartado en el programa.','Mejorar formulación y comparar con el formato histórico antes de liberar.'],'checkedAt':'2026-10-15','sourceFingerprintsChecked':True,'syllabusChecked':False,'temporalChecked':True,'uniqueAnswerChecked':False}})
output=ROOT/'literal-candidates.json'
if output.exists() and json.loads(output.read_text())!=rows:raise RuntimeError('Existing candidate version differs: preserve it and create a new version.')
output.write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(ROOT/'candidate-preparation-report.json').write_text(json.dumps({'drafts':len(rows),'byTopic':dict(Counter(q['topicId'] for q in rows)),'eligible':0,'skipped':skipped,'warning':'Literal draft candidates only. No claim of a complete realistic new exam.'},ensure_ascii=False,indent=2))
print(json.dumps({'drafts':len(rows),'eligible':0,'skipped':skipped,'byTopic':dict(Counter(q['topicId'] for q in rows))},ensure_ascii=False))
