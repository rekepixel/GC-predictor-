import urllib.request,concurrent.futures,pathlib,hashlib,gzip,json,xml.etree.ElementTree as E
root=pathlib.Path('data/generated/2027-v1');root.mkdir(parents=True,exist_ok=True)
ids=['BOE-A-1978-31229','BOE-A-2007-6115','BOE-A-1995-24292','BOE-A-1889-4763','BOE-A-1995-25444','BOE-A-1882-6036','BOE-A-1984-11620','BOE-A-1985-12666','BOE-A-2015-10565','BOE-A-2015-10566','BOE-A-2018-16673','BOE-A-2000-544','BOE-A-2007-4184','BOE-A-2015-3442','BOE-A-2014-3649','BOE-A-2024-3793','BOE-A-2024-3791','BOE-A-1986-6859','BOE-A-2014-12408','BOE-A-2007-18391','BOE-A-2015-7730','BOE-A-2007-21490','BOE-A-2022-10757','BOE-A-2020-14046','BOE-A-2010-1331','BOE-A-2022-3477','BOE-A-2000-641','BOE-A-2004-21760','BOE-A-1993-6202','BOE-A-2017-2313','BOE-A-1995-26836','BOE-A-1998-21017','BOE-A-2003-22715','BOE-A-1983-10613','BOE-A-1981-10325']
def run(id):
 p=root/(id+'.xml.gz');url=f'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{id}/texto'
 try:
  if p.exists():b=gzip.decompress(p.read_bytes())
  else:b=urllib.request.urlopen(urllib.request.Request(url,headers={'Accept':'application/xml','User-Agent':'GC-Predictor-research/1.0'}),timeout=30).read();E.fromstring(b);p.write_bytes(gzip.compress(b,mtime=0))
  r=E.fromstring(b);blocks=[]
  for block in r.findall('.//texto/bloque'):
   versions=[v for v in block.findall('version') if v.get('fecha_publicacion','99999999')<='20261015' and v.get('fecha_vigencia','99999999')<='20261015']
   if not versions:continue
   v=max(versions,key=lambda x:(x.get('fecha_vigencia',''),x.get('fecha_publicacion','')))
   blocks.append({'id':block.get('id'),'title':block.get('titulo',''),'version':v.attrib,'text':' '.join(v.itertext())})
  (root/(id+'.selected.json')).write_text(json.dumps(blocks,ensure_ascii=False,indent=2))
  return {'id':id,'url':url,'sha256':hashlib.sha256(b).hexdigest(),'storageKey':str(p),'bytes':len(b),'blocks':len(blocks),'checkedAsOf':'2026-10-15'}
 except Exception as e:return {'id':id,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:out=list(ex.map(run,ids))
(root/'source-manifest.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps([{'id':x['id'],'blocks':x.get('blocks'),'error':x.get('error')} for x in out]))
