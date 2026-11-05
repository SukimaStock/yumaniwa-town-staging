import {beforeC1} from '../h1-c1/source-inverse.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs?v=market-rules-r1&touch=1';
import {createCaskSerials} from '../cask-serials.mjs?v=market-rules-r1';
import {fill,advance} from './brands-helpers.mjs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('app supplies its strict validator and retains separate historical replay',()=>{
 const main=text('shop-app.mjs'),serial=text('cask-serials.mjs');
 assert.match(main,/createCaskSerials\(\{validate:D\.validateDistillery\}\)/);
 assert.notEqual(main.match(/import \* as D from '([^']+)'/)[1],serial.match(/import \* as D from '([^']+)'/)[1]);
});
test('shared validation preserves partial progress, divergent operations, reset and rejected state',()=>{
 const resolver=createCaskSerials({validate:D.validateDistillery});
 let base=fill(D.newStaffDistillery(42));
 const raw=D.serializeDistillery(base),first=[...resolver(base)];
 const restored=D.restoreDistillery(raw);assert.deepEqual([...resolver(restored)],first);
 let a=fill(advance(base,1)),b=fill(advance(base,2));
 const expectedA=[...createCaskSerials()(a)],expectedB=[...createCaskSerials()(b)];
 assert.deepEqual([...resolver(a)],expectedA);assert.deepEqual([...resolver(b)],expectedB);
 assert.deepEqual([...resolver(base)],first);
 assert.deepEqual([...resolver(D.newStaffDistillery(99))],[]);
 const corrupt=structuredClone(base);corrupt.core.cash++;
 assert.throws(()=>resolver(corrupt));
 assert.deepEqual([...resolver(base)],first);assert.equal(D.serializeDistillery(base),raw);
 let partial=D.startDistillation(advance(base,1));
 for(let i=0;i<3;i++){partial=D.distillStep(partial);assert.deepEqual([...resolver(partial)],first);}
});


test('historical replay cannot replace the formal reader’s current checkpoint',()=>{
 const official=new URL('../partner-orders.mjs?v=market-rules-r1&touch=1',import.meta.url).href;
 const historical=new URL('../partner-orders.mjs?v=market-rules-r1',import.meta.url).href;
 const serial=new URL('../cask-serials.mjs?v=market-rules-r1&startup=h1-c1-2',import.meta.url).href;
 const fixture=new URL('./fixtures/placement-established-six.json',import.meta.url).href;
 execFileSync(process.execPath,['--input-type=module','-e',`
  import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';
  registerHooks({load(url,context,next){const result=next(url,context);if(url===${JSON.stringify(official)}||url===${JSON.stringify(historical)})return {...result,source:Buffer.from(result.source).toString()+'\\nexport const checkpointLengthForTest=()=>checkpoint?.length;'};return result;}});
  const D=await import(${JSON.stringify(official)}),H=await import(${JSON.stringify(historical)}),{createCaskSerials}=await import(${JSON.stringify(serial)});
  const raw=JSON.parse(readFileSync(new URL(${JSON.stringify(fixture)}),'utf8')).raw;
  const s=D.restoreDistillery(raw),count=s.operations.length;
  assert(s.operations.some(op=>op.key==='enable-stage4'));
  assert.equal(D.checkpointLengthForTest(),count);
  const actual=[...createCaskSerials({validate:D.validateDistillery})(s)];
  assert.equal(D.checkpointLengthForTest(),count,'historical replay evicted the live validation cache');
  assert.deepEqual(actual,[...createCaskSerials({validate:H.validateDistillery})(s)]);
  assert(H.checkpointLengthForTest()<count,'fixture no longer reproduces the rejected shared-module design');
  assert.equal(D.serializeDistillery(s),raw);
 `],{encoding:'utf8'});
});


test('reviewed C1 inverse preserves the prior exact source and rejects duplicated hunks',()=>{
 for(const name of ['shop-app.mjs','index.html','cask-serials.mjs']){
  const actual=text(name),base=execFileSync('git',['show','74924b2729565531dcc3a499dcb7e24bcc0dced8:works/ambertime/'+name],{encoding:'utf8',maxBuffer:8e6});
  assert.equal(beforeC1(actual,name),base);
  assert.equal(beforeC1(actual+'\n// unrelated change',name),base+'\n// unrelated change');
  assert.throws(()=>beforeC1(actual+actual,name),/exact reviewed C1 hunk/);
 }
});
