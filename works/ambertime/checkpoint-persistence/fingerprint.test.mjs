import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {dependencyFingerprint,dependencyManifest} from './fingerprint.mjs';

function fixture(){
 const root=mkdtempSync(join(tmpdir(),'amber-fingerprint-'));
 const write=(name,text)=>{const file=join(root,name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text);};
 for(const name of ['partner-orders.mjs','checkpoint-persistence/boundary-run.mjs','checkpoint-persistence/fingerprint.mjs','checkpoint-persistence/online.test.mjs','chronicle-lab/caption.mjs','chronicle-lab/research-h25.mjs','chronicle-lab/recall-boundary.mjs'])write(name,'// '+name+'\n');
 for(const name of ['chronicle-lab/facts-recalls-long.json','chronicle-lab/nested/oracle.json','save-audit/results.json','checkpoint-research/results.json','checkpoint-persistence/results.json'])write(name,'{}\n');
 return {root,write};
}

test('historical extraction, caption, boundary and oracle changes invalidate completion reuse',()=>{
 const {root,write}=fixture();
 try{
  const original=dependencyFingerprint('model-v1',{root});
  for(const path of ['chronicle-lab/caption.mjs','chronicle-lab/research-h25.mjs','chronicle-lab/recall-boundary.mjs','chronicle-lab/facts-recalls-long.json','chronicle-lab/nested/oracle.json','save-audit/results.json','checkpoint-research/results.json']){
   const text=readFileSync(join(root,path),'utf8');write(path,text+' ');
   assert.notEqual(dependencyFingerprint('model-v1',{root}),original,path+' must invalidate existing complete result');
   write(path,text);assert.equal(dependencyFingerprint('model-v1',{root}),original);
  }
  assert.notEqual(dependencyFingerprint('model-v2',{root}),original,'model rules must invalidate');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('dependency manifest covers research/test sources, additions/deletions and excludes generated result cycles',()=>{
 const {root,write}=fixture();
 try{
  const original=dependencyFingerprint('model',{root}),manifest=dependencyManifest({root});
  assert.deepEqual(manifest.map(([path])=>path),manifest.map(([path])=>path).toSorted());
  for(const path of ['checkpoint-persistence/boundary-run.mjs','checkpoint-persistence/fingerprint.mjs','checkpoint-persistence/online.test.mjs'])assert(manifest.some(([p])=>p===path),path);
  assert(!manifest.some(([p])=>p==='checkpoint-persistence/results.json'));
  write('checkpoint-persistence/results.json','{"new":"measurements"}');
  assert.equal(dependencyFingerprint('model',{root}),original,'generated aggregate must not create a fingerprint cycle');
  write('future/new-collector.mjs','export const future = true;');
  assert.notEqual(dependencyFingerprint('model',{root}),original,'new source must invalidate');
  rmSync(join(root,'future/new-collector.mjs'));assert.equal(dependencyFingerprint('model',{root}),original);
  rmSync(join(root,'chronicle-lab/recall-boundary.mjs'));assert.notEqual(dependencyFingerprint('model',{root}),original,'removed dependency must invalidate');
 }finally{rmSync(root,{recursive:true,force:true});}
});
