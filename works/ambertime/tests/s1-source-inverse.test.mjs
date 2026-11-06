import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {beforeS1} from './s1-source-inverse.mjs';
const changes=JSON.parse(readFileSync(new URL('./s1-source-inverse.json',import.meta.url),'utf8'));
test('S1 inverse preserves exact latest-main bytes and rejects altered or duplicated authorized hunks',()=>{
 for(const [name,change] of Object.entries(changes)){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const baseline=execFileSync('git',['show',change.baseCommit+':works/ambertime/'+name],{encoding:'utf8',maxBuffer:8e6});
  assert.equal(createHash('sha256').update(baseline).digest('hex'),change.baseSha256);
  assert.equal(beforeS1(source,name),baseline);
  assert.equal(beforeS1(source+'\n// unrelated change',name),baseline+'\n// unrelated change');
  assert.throws(()=>beforeS1(source+source,name),/exact reviewed S1 hunk/);
  const h=change.hunks[0];
  assert.throws(()=>beforeS1(source.replace(h.after,h.after.replace('\n','\n// changed delta\n')),name),/exact reviewed S1 hunk/);
 }
});
