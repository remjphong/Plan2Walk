"""Offline inventory, candidate grouping and honest evaluation prerequisites. No model training."""
import pathlib,hashlib,json,csv,random
from PIL import Image,ImageChops,ImageStat
root=pathlib.Path(__file__).resolve().parents[1]
groups={'images.jpg':'one-room','images (1).jpg':'ensuite','images (2).jpg':'one-room','images (3).jpg':'multiple-floorplans','images (4).jpg':'multi-room','images (5).jpg':'ensuite','images (6).jpg':'multi-room','images (7).jpg':'ensuite','images (8).jpg':'multiple-floorplans','images (9).jpg':'ensuite','images (10).jpg':'multi-room','images (11).jpg':'commercial','images (12).jpg':'multi-room','images (13).jpg':'office','images (14).jpg':'commercial','images (15).jpg':'multi-room','images.png':'commercial'}
# Conservative family clustering: same publisher/style held together; all assignments need human approval.
families={'images (7).jpg':'rega','images (9).jpg':'rega','images (11).jpg':'engineering-commercial','images (14).jpg':'engineering-commercial','images (3).jpg':'multi-sheet','images (8).jpg':'multi-sheet'}
paths=sorted((root/'data/raw').glob('*'));rows=[];hashes={};thumbs={}
for p in paths:
 with Image.open(p) as im:
  im.load();w,h=im.size;fmt=im.format;gray=im.convert('L').resize((16,16));mean=ImageStat.Stat(gray).mean[0];ahash=''.join('1' if v>mean else '0' for v in gray.getdata());thumbs[p.name]=ahash
 sha=hashlib.sha256(p.read_bytes()).hexdigest();family=families.get(p.name,p.stem)
 rows.append(dict(filename=p.name,sha256=sha,width=w,height=h,format=fmt,size_bytes=p.stat().st_size,group=groups[p.name],family=family,split=None,split_reviewed=False,has_verified_annotations=False,source_license_verified=False,inspection='visual contact sheet + decode; geometry not annotated',exact_duplicate_of=hashes.get(sha)))
 hashes[sha]=p.name
unique=sorted(set(r['family'] for r in rows));random.Random(20261112).shuffle(unique)
splits={f:('holdout' if i<3 else 'validation' if i<6 else 'development') for i,f in enumerate(unique)}
for r in rows:r['split']=splits[r['family']]
near=[]
for i,a in enumerate(rows):
 for b in rows[i+1:]:
  d=sum(x!=y for x,y in zip(thumbs[a['filename']],thumbs[b['filename']]))
  if d<45:near.append(dict(a=a['filename'],b=b['filename'],average_hash_hamming=d,action='human compare; do not automatically treat as same drawing'))
(root/'data/manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(root/'reports/duplicate_candidates.json').write_text(json.dumps(near,ensure_ascii=False,indent=2))
with (root/'data/manifest.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
for r in rows:
 target=root/'data/annotations'/(r['filename']+'.json')
 if not target.exists():target.write_text(json.dumps({'schemaVersion':'annotation-1','image_sha256':r['sha256'],'review':{'status':'unreviewed','reviewer':None,'reviewedAt':None},'plan':None},indent=2))
print(json.dumps({'images':len(rows),'decoded':len(rows),'exact_duplicates':len(rows)-len(hashes),'near_duplicate_candidates':len(near),'verified_annotations':0,'split_status':'provisional: human family review required'}))
