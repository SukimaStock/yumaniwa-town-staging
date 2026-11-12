import pathlib,subprocess,json,sys,statistics,os
repo,fixtures,prefixes,out=map(lambda p:pathlib.Path(p).resolve(),sys.argv[1:5]);years=int(sys.argv[5]);repeats=int(sys.argv[6])if len(sys.argv)>6 else 3;out.mkdir(parents=True,exist_ok=True);lab=repo/'works/ambertime/design/private-replay-v13';allrows=[]
for name in ['local','diversified']:
 vals={k:[]for k in 'ABC'}
 for i in range(repeats):
  for mode in ['ABC','BCA','CAB'][i%3]:
   target=out/f'{name}-{years}-{mode}-{i}.json';cmd=['node']
   if mode!='A':cmd+=['--experimental-loader',str(lab/'loader.mjs')]
   cmd+=[str(lab/'gate.mjs'),str(fixtures),str(prefixes),str(target),name,str(years),mode];env={**os.environ,'AMBERTIME_REPLAY_VARIANT':mode}
   p=subprocess.run(cmd,env=env,capture_output=True,text=True);target.with_suffix('.log').write_text(p.stdout+p.stderr);assert p.returncode==0,(name,mode,i,p.stderr);x=json.loads(target.read_text());assert x['completed'];vals[mode].append(x);print(name,years,mode,i,round(x['totalVerifiedReturnMs']),flush=True)
 digests={x['outputSHA256']for v in vals.values()for x in v};assert len(digests)==1
 row={'name':name,'years':years,'equal':True}
 for mode,v in vals.items():
  ts=[x['totalVerifiedReturnMs']for x in v];row[mode]={'medianMs':statistics.median(ts),'rangeMs':[min(ts),max(ts)],'RSSKiB':[x['peakRSSKiB']for x in v]}
 allrows.append(row);(out/'summary.json').write_text(json.dumps({'completed':len(allrows)==2,'repeats':repeats,'rows':allrows},indent=2))
