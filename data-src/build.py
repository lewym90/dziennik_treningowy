import json,glob,re
r=json.load(open('/tmp/fedb/rest.json'))
pl={}
for f in sorted(glob.glob('pl-*.json')): pl.update(json.load(open(f)))
MU={'abdominals':'abs','abductors':'glutes','adductors':'quads','biceps':'biceps','calves':'calves','chest':'chest','forearms':'forearms','glutes':'glutes','hamstrings':'hams','lats':'back','lower back':'back','middle back':'back','neck':'shoulders','quadriceps':'quads','shoulders':'shoulders','traps':'back','triceps':'triceps'}
EQ={'barbell':'Sztanga','e-z curl bar':'Sztanga','dumbbell':'Hantle','machine':'Maszyna','cable':'Wyciąg','kettlebells':'Kettlebell','body only':'Masa ciała','None':'Masa ciała'}
REN={}
seed=[];info={};db={}
from collections import Counter
REN.update({'Barbell_Squat':'Przysiad ze sztangą na barkach (wariant)','Machine_Bench_Press':'Wyciskanie na maszynie siedząc','Dumbbell_Lying_Rear_Lateral_Raise':'Unoszenie hantli w bok leżąc na brzuchu'})
REN={k:v for k,v in REN.items() if v}

for e in r:
    i=e['id']; nid='fe_'+re.sub(r'[^a-z0-9]+','_',i.lower()).strip('_')
    t=dict(pl[i])
    t['n']=REN.get(i,t['n'])
    pm=[MU[m] for m in e['primaryMuscles']]; sm=[MU[m] for m in e['secondaryMuscles']]
    mus=pm[0] if pm else 'full'
    cat=e['category']; eq=EQ.get(str(e['equipment']),'Inne')
    nm=e['name'].lower()
    if re.search(r'pull-?up|chin-?up|muscle-?up',nm) and eq=='Masa ciała': eq='Drążek'
    if cat in('stretching','cardio'): ty='time'
    elif eq in('Masa ciała','Drążek'): ty='bwr' if eq=='Drążek' else 'br'
    else: ty='wr'
    comp=1 if e['mechanic']=='compound' else 0
    seed.append([nid,t['n'],mus,eq,ty,comp,e['name']])
    pp=list(dict.fromkeys(pm)); ss=[m for m in dict.fromkeys(sm) if m not in pp]
    info[nid]={'d':i,'n':len(e['images']),'p':pp,'s':ss,'i':e['instructions'],'t':t['t']}
    db[nid]={'pm':e['primaryMuscles'],'sm':e['secondaryMuscles'],'lv':e['level'],'fo':e['force'],'me':e['mechanic'],'ca':cat,'eq':e['equipment']}
js='/* FORGE — import całej bazy Free Exercise DB (Unlicense) github.com/yuhonas/free-exercise-db. Polskie nazwy i opisy: FORGE. Plik generowany (data-src/build.py). */\n'
js+='(function(){window.F=window.F||{};F.SEED=F.SEED||[];F.EXINFO=F.EXINFO||{};F.EXDB={};\nconst S='+json.dumps(seed,ensure_ascii=False,separators=(',',':'))+';\nconst I='+json.dumps(info,ensure_ascii=False,separators=(',',':'))+';\nconst D='+json.dumps(db,ensure_ascii=False,separators=(',',':'))+';\nS.forEach(s=>F.SEED.push(s));Object.assign(F.EXINFO,I);Object.assign(F.EXDB,D);})();\n'
open('../js/exdb.js','w').write(js)
print(len(seed),len(js))
