import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSpecimen} from '../engine/specimen.js';

// Owner-authorized repair changes only six invalid part ID tokens of #314.
// Reverse the exact renames and compare the original Git blob, including all
// whitespace, geometry, material, transforms and behaviors; no visual changes.
test('314: only six invalid decimal-containing IDs changed from original bytes',()=>{
 const raw=readFileSync(new URL('../objects/garden-compost-bin.json',import.meta.url),'utf8');
 const data=JSON.parse(raw);assert.equal(validateSpecimen(data),data);
 let original=raw;
 for(const side of ['front','back'])for(const n of ['0.57','0.3','0.03']){
  const oldId=`slat-${side}--${n}`,newId=`slat-${side}--${n.replace('.','-')}`;
  assert.equal(data.parts.filter(p=>p.id===newId).length,1);
  const token=`"id":"${newId}"`;assert.equal(original.split(token).length,2);
  original=original.replace(token,`"id":"${oldId}"`);
 }
 const hash=createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(original)+'\0')).update(original).digest('hex');
 assert.equal(hash,'ea915e49332f8cc4c0b79b3d74e06bea0c7d9185');
});
