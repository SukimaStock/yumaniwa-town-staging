import pathlib,subprocess,sys,json,statistics
repo,fixtures,out=map(lambda x:pathlib.Path(x).resolve(),sys.argv[1:4]);steps=int(sys.argv[4]) if len(sys.argv)>4 else 36
out.mkdir(parents=True,exist_ok=False);lab=repo/'works/ambertime/design/town-v11';rows=[]
for name in ['local','regional','bulk','small','diversified']:
 for mode in ['A','C']:
  with open(out/f'{name}-{mode}.log','w') as f:subprocess.run(['node',str(lab/'protocol.mjs'),str(fixtures),str(out/f'{name}-{mode}'),name,mode,str(steps)],cwd=repo,stdout=f,stderr=subprocess.STDOUT,check=True)
 a=json.loads((out/f'{name}-A.json').read_text());c=json.loads((out/f'{name}-C.json').read_text());assert a['completed'] and c['completed'];assert a['outputSHA256']==c['outputSHA256'] and a['aliasSHA256']==c['aliasSHA256'];assert (out/f'{name}-A.state.json').read_bytes()==(out/f'{name}-C.state.json').read_bytes()
 rows.append({'name':name,'wholeTownAndAliasEqual':True,'AmedianMs':statistics.median(x['total'] for x in a['samples']),'CmedianMs':statistics.median(x['total'] for x in c['samples']),'Arange':[min(x['total'] for x in a['samples']),max(x['total'] for x in a['samples'])],'Crange':[min(x['total'] for x in c['samples']),max(x['total'] for x in c['samples'])],'ApeakRSSKiB':a['peakRSSKiB'],'CpeakRSSKiB':c['peakRSSKiB']})
(out/'summary.json').write_text(json.dumps({'completed':True,'children':10,'steps':steps,'rows':rows},indent=2));print('PASS10 processes full native town + alias equality; NOT whole-game formal cold protocol')
