import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs?v=market-rules-r1';
import {createCaskSerials} from '../cask-serials.mjs?v=market-rules-r1';
import {fill,advance} from './brands-helpers.mjs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('main reader and serial projection use exactly the same model module URL',()=>{
 const main=text('shop-app.mjs').match(/import \* as D from '([^']+)'/)[1];
 const serial=text('cask-serials.mjs').match(/import \* as D from '([^']+)'/)[1];
 assert.equal(main,serial);
});
test('shared validation preserves partial progress, divergent operations, reset and rejected state',()=>{
 const resolver=createCaskSerials();
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
