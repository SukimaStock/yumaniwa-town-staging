import pathlib,subprocess,json,sys,statistics
repo,fixtures,out=map(lambda p:pathlib.Path(p).resolve(),sys.argv[1:]);out.mkdir(exist_ok=True,parents=True);lab=repo/'works/ambertime/design/transaction-v12';rows=[]
for i,name in enumerate(['local','regional','bulk','small','diversified']):
 vals={}
 for mode in (['A','C'] if i%2==0 else ['C','A']):
  target=out/f'{name}-{mode}.json';cmd=['node','--experimental-loader',str(lab/'loader.mjs'),str(lab/'measure.mjs'),str(fixtures),str(target),name,mode]
  p=subprocess.run(cmd,capture_output=True,text=True);(out/f'{name}-{mode}.log').write_text(p.stdout+p.stderr);assert p.returncode==0,(name,mode,p.stderr);x=json.loads(target.read_text());assert x['completed'];vals[mode]=x
 assert vals['A']['outputSHA256']==vals['C']['outputSHA256'];r={'name':name,'outputEqual':True}
 for mode,x in vals.items():
  times=[s['ms'] for s in x['samples']];r[mode]={'medianMs':statistics.median(times),'rangeMs':[min(times),max(times)],'peakRSSKiB':x['peakRSSKiB']}
 rows.append(r);print(r,flush=True)
(out/'summary.json').write_text(json.dumps({'completed':True,'childProcesses':10,'repeatsPerChild':5,'scope':'Single actual monthly tick; not cold restore','rows':rows},indent=2))
