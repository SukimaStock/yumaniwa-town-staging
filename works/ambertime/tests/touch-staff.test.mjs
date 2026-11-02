import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';

// Captured at bbdd8865 before implementation, using the same paid manual career.
const historicalHashes={5:'9a6a74d0bc801b5ac28bc3b71c70a54fc98ff798c78ff73963f8db0844210fbd',6:'974149125ec7f906a08d25a44a81cfd69446e6bde6d1599157cfbc2d31077c51',7:'d8da953c1be225e3f9819c86bcfb113f363cf93f354f48313fb66c8b89952d77',8:'e12620b226f7867d0bab1325de67cfa30bbeadef03a55fef73688d9c19fdc9ca'};
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8e6}),raw);return D.restoreDistillery(raw);}
function sellAndWait(s){s=advance(s,6);s=D.bottleBranded(s,s.core.casks.at(-1).id);s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);return advance(s,6);}
let sixth;
test('six completed manual fills offer the distiller while historical v1 save bytes stay exact',()=>{
 let s=D.newStaffExperienceDistillery(42);
 for(let count=1;count<=8;count++){
  s=fill(s,{progress:65});
  assert.equal(D.staffStatus(s).unlocked,count>=6);
  assert.equal(D.staffOpportunities(s).some(o=>o.kind==='distill'),count>=6);
  assert.equal(s.staffProgression.distill.unlocked,count>=8,'preserve historical completion replay');
  if(count===5){assert.equal(D.staffStatus(s).canHire,false);assert.throws(()=>D.hireStaff(s));assert.throws(()=>D.noticeStaffOpportunity(s,'distill'));}
  if(count===6){assert.equal(D.staffStatus(s).canHire,true);sixth=structuredClone(s);}
  if(count>=5){const raw=D.serializeDistillery(s);assert.equal(createHash('sha256').update(raw).digest('hex'),historicalHashes[count]);cold(s);}
  if(count<8)s=sellAndWait(s);
 }
});
test('earlier discovery uses existing notice and hire operations, with unchanged hiring costs and no idle salary',()=>{
 assert(sixth);const original=D.serializeDistillery(sixth),core=structuredClone(sixth.core);
 let noticed=D.noticeStaffOpportunity(sixth,'distill');
 assert.equal(D.serializeDistillery(sixth),original);assert.deepEqual(noticed.core,core);
 assert.equal(noticed.operations.at(-1).key,'staff-opportunity-notice');
 assert.equal(noticed.staffProgression.distill.unlocked,true);assert.equal(noticed.staffProgression.distill.noticed,true);
 assert.equal(D.staffOpportunities(noticed).some(o=>o.kind==='distill'),false);noticed=cold(noticed);
 for(const source of [sixth,noticed]){
  const before=D.staffStatus(source),hired=D.hireStaff(source);
  assert.equal(before.hireCost,40);assert.equal(before.salary,12);
  assert.equal(hired.operations.at(-1).key,'staff-hire');assert.equal(hired.staffProgression.distill.unlocked,true);
  assert.equal(hired.core.cash,source.core.cash-40);assert.equal(hired.core.totals.costs,source.core.totals.costs+40);
  assert.deepEqual(hired.core.casks,source.core.casks);assert.deepEqual(hired.staffExperience,source.staffExperience);
  assert.equal(hired.staffProgression.bottling.unlocked,source.staffProgression.bottling.unlocked);
  cold(hired);const waited=advance(hired,1);assert.equal(waited.core.totals.costs,hired.core.totals.costs);cold(waited);
 }
});
