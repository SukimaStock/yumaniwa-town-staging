#!/usr/bin/env python3
"""Sequential fresh-process verification; no oracle retained by the launcher."""
import argparse,hashlib,json,pathlib,platform,subprocess,sys,time
p=argparse.ArgumentParser();p.add_argument('repo',type=pathlib.Path);p.add_argument('fixtures',type=pathlib.Path);p.add_argument('output',type=pathlib.Path)
p.add_argument('--mode',choices=['full','baseline','profile'],default='full');p.add_argument('--strategies',nargs='+',default=['local','regional','bulk','small','diversified']);p.add_argument('--node',default='node');args=p.parse_args()
repo=args.repo.resolve();fixtures=args.fixtures.resolve();output=args.output.resolve();output.mkdir(parents=True,exist_ok=True)
script=pathlib.Path(__file__).with_name('protocol.mjs').resolve()
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
manifest=json.loads((fixtures/'SHA256SUMS.json').read_text())
checks=[]
for filename,expected in manifest.items():
 actual=sha(fixtures/filename)
 if actual!=expected:raise RuntimeError('fixture SHA mismatch: '+filename)
 checks.append(filename)
manifest_check={'manifestSHA256':sha(fixtures/'SHA256SUMS.json'),'verifiedFiles':len(checks),'allMatch':True}
(output/'fixture-verification.json').write_text(json.dumps(manifest_check,indent=2)+'\n')
summary={'command':sys.argv,'environment':platform.platform(),'mode':args.mode,'fixtureVerification':manifest_check,'results':[],'complete':False}
summary_path=output/'process-results.json'
if summary_path.exists():raise RuntimeError('output already has process-results; use fresh directory')
for name in args.strategies:
 for mode in (['save','cold1','cold2'] if args.mode=='full' else [args.mode]):
  command=[args.node,str(script),mode,str(repo),str(fixtures),str(output),name]
  print('START',name,mode,flush=True);start=time.monotonic()
  with (output/(name+'.'+mode+'.stdout')).open('w') as stdout,(output/(name+'.'+mode+'.stderr')).open('w') as stderr:
   child=subprocess.run(command,stdout=stdout,stderr=stderr)
  row={'strategy':name,'mode':mode,'command':command,'exitCode':child.returncode,'elapsedSeconds':time.monotonic()-start}
  result_file=output/(name+'.'+mode+'.result.json')
  row['finalJSON']=result_file.exists()
  if child.returncode==0:
   result=json.loads(result_file.read_text());assert result['completed'] is True
   row['resultSHA256']=sha(result_file)
  summary['results'].append(row);summary_path.write_text(json.dumps(summary,indent=2)+'\n');print('END',json.dumps(row),flush=True)
  if child.returncode:raise SystemExit(child.returncode)
summary['complete']=True;summary['allProcessesNormalExit']=True
summary_path.write_text(json.dumps(summary,indent=2)+'\n');print('FINAL',json.dumps(summary),flush=True)
