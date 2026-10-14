#!/usr/bin/env python3
"""Extract a reviewable draft. No OCR, guessing of answers or automatic validation.
Printed reserve numbers 1..5 become internal IDs 101..105, retaining printedNumber.
"""
import argparse, json, re, sys
from pathlib import Path
from pypdf import PdfReader

def extract(pdf):
    reader=PdfReader(pdf); result=[]; active=False; reserve=False; current=None; option=None; warnings=[]
    def flush():
        nonlocal current
        if current:
            current['stem']=current['stem'].strip()
            current['options']=[o.strip() for o in current['options']]
            if len(current['options'])==4 and all(current['options']): result.append(current)
            else: warnings.append(f"Página {current['sourcePage']}, nº {current['number']}: no se reconocieron cuatro opciones. Revisión manual.")
        current=None
    for page_no,page in enumerate(reader.pages,1):
        text=page.extract_text() or ''
        # Do not include spelling/grammar/English, whose numbering starts again at 1.
        for line in text.splitlines():
            stripped=line.strip()
            if 'PRUEBA DE CONOCIMIENTOS GENERALES' in stripped.upper(): active=True;continue
            if active and re.search(r'PRUEBA DE (?:LENGUA|IDIOMA|INGL)',stripped,re.I): flush();active=False;break
            if not active: continue
            if re.search(r'PREGUNTAS? DE RESERVA',stripped,re.I): flush();reserve=True;continue
            if re.search(r'CONCURSO.OPOSICI|Resoluci[oó]n 160/|ACCESO A LA ESCALA|EJERCICIO DE CONOCIMIENTOS|NUMERADAS DEL|LAS SIGUIENTES PREGUNTAS|^MINISTERIO|^DIRECCI[ÓO]N|^GUARDIA CIVIL$',stripped,re.I):continue
            head=re.match(r'^\s*(\d{1,3})\s*[).]\s+(.+)',line)
            if head:
                flush();printed=int(head[1]);number=100+printed if reserve and printed<100 else printed
                current={'number':number,'printedNumber':printed,'stem':head[2],'options':[],'sourcePage':page_no,'reserve':reserve};option=None;continue
            choice=re.match(r'^\s*([a-d])\)\s*(.*)',line,re.I)
            if choice and current:
                index=ord(choice[1].lower())-97
                if index==len(current['options']):current['options'].append(choice[2]);option=index
                else:warnings.append(f'Opción fuera de orden en nº {current["number"]}.')
                continue
            if current and stripped:
                if option is None:current['stem']+='\n'+line.strip()
                else:current['options'][option]+='\n'+line.strip()
    flush()
    if not result:warnings.append('Sin texto reconocible de conocimientos generales. Documento escaneado: aplicar OCR local y revisar manualmente, o transcribir JSON.')
    numbers=[q['number'] for q in result]
    if len(set(numbers))!=len(numbers):warnings.append('Numeración repetida. No importar sin separar pruebas.')
    warnings.append('Borrador automático sin validación literal ni de respuestas. No utilizar para estadísticas.')
    return {'schemaVersion':1,'file':str(pdf),'questions':result,'warnings':warnings,'pages':len(reader.pages)}

def key_2026(pdf,model):
    """Layout-specific extraction, only the labelled general-knowledge table; stays provisional."""
    pages=PdfReader(pdf).pages; text=pages[0 if model=='A' else 1].extract_text() or ''
    table=text.split('PRUEBA DE CONOCIMIENTOS',1)[1].split('PRUEBA DE IDIOMA',1)[0]
    rows=[{'number':int(n),'correct':ord(a.upper())-65,'cancelled':False} for n,a in re.findall(r'\b(\d{1,3})\s+([ABCD])\b',table)]
    text2=pages[1].extract_text() or ''; reserves=text2.split('PREGUNTAS DE RESERVA',1)[1].split('PRUEBA DE CONOCIMIENTOS',1)[1].split('PRUEBA DE ORTOGRAFÍA',1)[0]
    rows.extend({'number':int(n),'correct':ord(a)-65,'cancelled':False} for n,a in re.findall(r'\b(10[1-5])\s+([ABCD])\b',reserves))
    if len(rows)!=105 or len(set(r['number']for r in rows))!=105:raise ValueError('La tabla no tiene 105 respuestas distintas. Revisar plantilla.')
    return sorted(rows,key=lambda r:r['number'])

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('pdf',type=Path);parser.add_argument('--out',type=Path);parser.add_argument('--key-2026',choices=['A','B']);args=parser.parse_args()
    payload=key_2026(args.pdf,args.key_2026) if args.key_2026 else extract(args.pdf)
    text=json.dumps(payload,ensure_ascii=False,indent=2)
    if args.out:args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(text,encoding='utf8')
    else:print(text)
