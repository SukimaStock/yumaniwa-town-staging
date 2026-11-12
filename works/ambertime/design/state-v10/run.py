"""Offline Lab. No fixture regeneration or product edits. Native full saves unchanged."""
import sys,pathlib,subprocess,json,statistics
repo,fixtures,out=map(lambda x:pathlib.Path(x).resolve(),sys.argv[1:4]);out.mkdir(parents=True,exist_ok=False)
lab=repo/'works/ambertime/design/state-v10'; rows=[]
for name in ['local','regional','bulk','small','diversified']:
 for mode in ['A','B']:
  prefix=out/f'{name}-{mode}'
  cmd=['node']+(['--experimental-loader',str(lab/'loader.mjs')] if mode=='B' else [])+[str(lab/'measure.mjs'),str(fixtures),str(prefix),name,mode]
  with open(str(prefix)+'.log','w') as log:subprocess.run(cmd,cwd=repo,stdout=log,stderr=subprocess.STDOUT,check=True)
 a=json.loads((out/f'{name}-A.json').read_text());b=json.loads((out/f'{name}-B.json').read_text())
 assert a['completed'] and b['completed'] and a['monthAfter']==a['monthBefore']+1
 assert (out/f'{name}-A.state.json').read_bytes()==(out/f'{name}-B.state.json').read_bytes()
 assert a.get('lowFundsOutputSHA256')==b.get('lowFundsOutputSHA256') and a.get('lowFundsException')==b.get('lowFundsException')
 rows.append({'name':name,'AmedianMs':statistics.median(a['samples']),'BmedianMs':statistics.median(b['samples']),'AminMax': [min(a['samples']),max(a['samples'])],'BminMax':[min(b['samples']),max(b['samples'])],'fullStateEquality':True,'lowFundsEquality':True,'ApeakRSSKiB':a['peakRSSKiB'],'BpeakRSSKiB':b['peakRSSKiB']})
(out/'summary.json').write_text(json.dumps({'completed':True,'childProcesses':10,'rows':rows},indent=2))
print('PASS: 10 child processes completed; five full next-month states and low-funds outcomes match. Not a five-strategy formal cold-restore protocol.')
