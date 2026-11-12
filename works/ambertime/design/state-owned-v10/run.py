import pathlib,subprocess,sys,json,statistics
repo,fixtures,out=map(lambda x:pathlib.Path(x).resolve(),sys.argv[1:4]);out.mkdir(parents=True,exist_ok=False);lab=repo/'works/ambertime/design/state-owned-v10';rows=[]
for name in ['local','regional','bulk','small','diversified']:
 for mode in ['A','C']:
  cmd=['node']+(['--experimental-loader',str(lab/'loader.mjs')] if mode=='C' else [])+[str(lab/'proof.mjs'),str(fixtures),str(out/f'{name}-{mode}'),name,mode]
  with open(out/f'{name}-{mode}.log','w') as f:subprocess.run(cmd,cwd=repo,stdout=f,stderr=subprocess.STDOUT,check=True)
 a=json.loads((out/f'{name}-A.json').read_text());c=json.loads((out/f'{name}-C.json').read_text());assert a['completed'] and c['completed'];assert a['aliasSignatureSHA256']==c['aliasSignatureSHA256'];assert (out/f'{name}-A.state.json').read_bytes()==(out/f'{name}-C.state.json').read_bytes()
 rows.append({'name':name,'wholeStateEqual':True,'AmedianTotalMs':statistics.median(x['total'] for x in a['samples']),'CmedianTotalMs':statistics.median(x['total'] for x in c['samples'])})
(out/'summary.json').write_text(json.dumps({'completed':True,'children':10,'rows':rows},indent=2));print('PASS 10 processes: economic-stage proof only, not full game/replay')
