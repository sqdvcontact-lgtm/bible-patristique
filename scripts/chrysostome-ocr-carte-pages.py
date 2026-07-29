"""Construit la carte page PDF -> segments par alignement de la couche OCR."""
import json,re,sys,unicodedata
from pathlib import Path
from pypdf import PdfReader
from rapidfuzz import fuzz

def norm(s):
 s=str(s or '').replace('ſ','s').replace('’',"'")
 s=''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c))
 return re.sub('[^a-z0-9]','',s.lower())

pdf=PdfReader(sys.argv[1]); segs=json.loads(Path(sys.argv[2]).read_text(encoding='utf8'))
rom=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV']
starts=[30,55,79,102,118,142,162,174,184,198,213,226,242,254,270,284,301,316,331,347,365,382,409,426,442]
plages=[(10,13,['Épître dédicatoire']),(14,19,['Avertissement historique']),(27,29,['Préface du traducteur','Approbation','Privilège du roi'])]
plages += [(starts[i],starts[i+1]-1,[f'Homélie {rom[i]}']) for i in range(24)]
carte=[]
for p1,p2,divs in plages:
 groupe=[s for s in segs if s['ref_niv1'] in divs]
 texte=''; bornes=[]
 for s in groupe:
  debut=len(texte); texte+=norm(s['segment_texte']); bornes.append((debut,len(texte),s['segment_numero']))
 for pn in range(p1,p2+1):
  src=norm(pdf.pages[pn-1].extract_text() or '')
  al=fuzz.partial_ratio_alignment(src,texte)
  nums=[n for d,f,n in bornes if f>=al.dest_start and d<=al.dest_end]
  carte.append({'page_pdf':pn,'page_imprimee':pn-29 if pn>=30 else None,'divisions':divs,'segment_debut':min(nums) if nums else None,'segment_fin':max(nums) if nums else None,'score':round(al.score/100,4),'source_debut':al.src_start,'source_fin':al.src_end,'corpus_debut':al.dest_start,'corpus_fin':al.dest_end})
Path(sys.argv[3]).write_text(json.dumps(carte,ensure_ascii=False,indent=2),encoding='utf8')
print(f'{len(carte)} pages cartographiées · score min {min(x["score"] for x in carte):.3f} · médian {sorted(x["score"] for x in carte)[len(carte)//2]:.3f}')
for x in sorted(carte,key=lambda x:x['score'])[:12]:print(x)
