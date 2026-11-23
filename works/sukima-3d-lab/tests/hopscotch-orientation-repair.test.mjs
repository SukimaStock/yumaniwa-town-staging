import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSpecimen} from '../engine/specimen.js';

test('316: only default display quaternion changed; exact original geometry and bytes remain',()=>{
 const raw=readFileSync(new URL('../objects/pavement-hopscotch.json',import.meta.url),'utf8');
 const d=JSON.parse(raw);assert.equal(validateSpecimen(d),d);
 const a=.35,b=.165,q=[Math.sin(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)*Math.sin(b),Math.cos(a)*Math.cos(b)];
 assert.deepEqual(d.display.orientation,q);
 const token='"orientation":'+JSON.stringify(q)+',"scale":1}';
 assert.equal(raw.split(token).length,2);
 const original=raw.replace(token,'"orientation":[0,0.16425233099048098,0,0.9864183553463477],"scale":1}');
 const hash=createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(original)+'\0')).update(original).digest('hex');
 assert.equal(hash,'5999df61c1638730724da3eae5b9fa5445a9da27');
});
