#!/usr/bin/env python3
import json,hashlib,base64
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'data/verified/documentary-audit-2023'
t=json.loads((base/'transcription.json').read_text());f=json.loads((root/'data/research/quality-audit-700/archive-replay.json').read_text())[0]
raw=(root/f['path']).read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
assert raw.startswith(b'%PDF') and sha(raw)==f['sha256']
assert base64.b32encode(hashlib.sha1(raw).digest()).decode()==f['archiveDigest']
bank=json.loads((root/'data/verified/history/bank.json').read_text());form=next(x for x in bank['forms'] if x['year']==2023 and x['session']=='2023-10-28')
rows=[]
for m in form['models']:
 matrix=[r.split() for r in t['matrices'][m['model']]];assert len(matrix)==10 and all(len(r)==10 for r in matrix)
 for q in m['questions']:
  n=q['number'];letter=t['reservesBothModels'][n-101] if q['reserve'] else matrix[(n-1)%10][(n-1)//10]
  old=chr(65+q['correct']);rows.append({'model':m['model'],'number':n,'reserve':q['reserve'],'bank':old,'archivedInstitutionalKey':letter,'matches':old==letter})
report={'schemaVersion':1,'id':'institutional-archive-key-2023-28','origin':'institutional_original_via_internet_archive','retrieval':f,'archiveDigestMatchesDownloadedSHA1':True,'originalInstitutionalCurrently404':True,'fullComparisonRows':len(rows),'ordinaryModelOccurrences':sum(not r['reserve'] for r in rows),'reserveModelOccurrences':sum(r['reserve'] for r in rows),'uniqueOrdinary':100,'uniqueReserves':5,'differences':[r for r in rows if not r['matches']],'rows':rows,'supersedesOriginalEvidence':False,'answerFinalityEstablished':False,'limits':t['limitations']}
(base/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
paths=[str(p.relative_to(root)) for p in sorted(base.iterdir()) if p.name!='manifest.json']+[f['path']]
if (base/'comparison-29.json').exists():
    paths.append(json.loads((base/'comparison-29.json').read_text())['retrieval']['path'])
(base/'manifest.json').write_text(json.dumps({'files':[{'path':p,'sha256':sha((root/p).read_bytes())} for p in paths]},indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['fullComparisonRows','ordinaryModelOccurrences','reserveModelOccurrences','differences','archiveDigestMatchesDownloadedSHA1']}))
