import json,sys
rest=json.load(open('/tmp/fedb/rest.json'))
a,b=int(sys.argv[1]),int(sys.argv[2])
for x in rest[a:b]:
    ins=' '.join(x['instructions'])
    if len(ins)>480: ins=ins[:480]+'…'
    print(f"{x['id']} | {x['name']} | {x['equipment']} | {x['level']} | {x['category']} | P:{','.join(x['primaryMuscles'])} S:{','.join(x['secondaryMuscles'])}\n  {ins}")
