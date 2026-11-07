import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {planSales,affinity} from '../market-sales.mjs';
import {planSales as legacyPlan} from '../experiments/market-design/v01/sales.mjs';
import {advanceTown} from '../town-connection.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {normalShopUnitPrice} from '../shop-demand.mjs';
import {advance,resolve} from './brands-helpers.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const source=()=>D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(fixture)));
function cold(s){const raw=D.serializeDistillery(s);assert.equal(execFileSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`],{input:raw,encoding:'utf8',maxBuffer:16e6}),raw);}
function ready(){let s=D.enableAlleyBar(source());for(let i=0;i<24&&s.shop.offer?.shopId!=='bar';i++)s=advance(s,1);assert.equal(s.shop.offer?.shopId,'bar');return D.acceptShop(s,'bar',s.shop.offer.id);}
function conserved(s){for(const p of s.core.products){const i=D.storeMarketInventory(s,p.id);assert.equal(i.hand+i.retail+i.assigned+i.held,p.stock);assert.equal(p.stock+p.sold,p.originalStock);}}
test('old save and replay boundary preserve all existing facts including tasting and partial progress',()=>{
 assert.equal(D.serializeDistillery(D.restoreDistillery(fixture)),fixture);
 for(const prepare of [s=>s,s=>D.sampleDistillery(s,s.core.casks[0].id),s=>{s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}]){
  const old=prepare(source()),raw=D.serializeDistillery(old),s=D.enableAlleyBar(old);
  for(const k of Object.keys(old).filter(k=>!['operations','storeMarket'].includes(k)))assert.deepEqual(s[k],old[k]);
  assert.deepEqual(s.operations.slice(0,-1),old.operations);assert.deepEqual(s.storeMarket,{...old.storeMarket,byShop:{...old.storeMarket.byShop,bar:{}}});assert.equal(D.serializeDistillery(old),raw);assert.equal(D.enableAlleyBar(s),s);assert.equal(D.serializeDistillery(D.preAlleyBarState(s)),raw);cold(s);
 }
});
test('bar offer comes from existing sales without requiring another formal shop or delivery',()=>{
 let s=source();assert(!D.shopEvidence(s,1,'bar').eligible);
 s=D.enableAlleyBar(s);assert(D.shopEvidence(s,1,'bar').eligible);
 const evidence=structuredClone(s);evidence.shop.relations=[];assert(D.shopEvidence(evidence,1,'bar').eligible);
 const rumor=structuredClone(s);for(const r of rumor.releases)r.sold=0;assert(!D.shopEvidence(rumor,1,'bar').eligible);
 rumor.labConnection.town.events.push({type:'interest',to:'bar',month:rumor.core.month-1,mainReleaseId:rumor.releases[0].id});assert(D.shopEvidence(rumor,1,'bar').eligible);
 s=ready();assert.equal(s.shop.deliveries.filter(d=>d.shopId==='bar').length,0);assert.deepEqual(s.storeMarket.byShop.bar,{});cold(s);
});
test('any flavor and young release may be assigned; placement earns nothing; real sales conserve and reach bar',()=>{
 let s=ready(),id=s.result.productId;
 const old=structuredClone(s),q=D.storeMarketQuote(s,id,'bar');assert(q.ok);
 s=D.assignStoreProduct(s,{productId:id,shopId:'bar',count:5});assert.deepEqual(s.core,old.core);assert.deepEqual(s.shop.deliveries,old.shop.deliveries);assert.deepEqual(s.labConnection.town.shipments,old.labConnection.town.shipments);conserved(s);cold(s);
 const before=s.core.cash;let sold=0;
 for(let i=0;i<36&&sold===0;i++){s=advance(s,1);sold=s.shop.deliveries.filter(d=>d.shopId==='bar').reduce((n,d)=>n+d.count,0);conserved(s);}
 assert(sold>0);assert(sold<=4);const receipt=s.shop.deliveries.find(d=>d.shopId==='bar');assert.equal(receipt.revenue,Math.round(receipt.count*q.unitPrice*100)/100);
 const shipments=s.labConnection.town.shipments.filter(x=>x.id==='shop:'+receipt.id);assert.equal(shipments.length,1);assert.equal(shipments[0].to,'bar');assert.equal(shipments[0].count,receipt.count);assert(!s.shop.relations.some(r=>r.shopId==='restaurant'));cold(s);
 const town=structuredClone(s.labConnection.town);advanceTown(town,town.month+48);assert(town.arrivals.some(e=>e.to==='bar'&&e.channel==='direct'));assert(town.arrivals.some(e=>e.to==='restaurant'&&e.path.includes('bar')));assert(!s.shop.relations.some(r=>r.shopId==='restaurant'));
 s=D.returnStoreProduct(s,{productId:id,shopId:'bar'});conserved(s);cold(s);
});
test('bar has low volume with smoke/body preference; old venues remain exactly the frozen algorithm',()=>{
 const p={id:1,count:100,age:0,character:.7,wood:.3,roughness:.8,price:22,referencePrice:22,flavor:{smoke:1,body:0,fruit:0,grain:0}};
 const weak={...p,flavor:{smoke:0,body:0,fruit:1,grain:0}};assert(affinity('bar',p)>affinity('bar',weak));
 const totals=[];for(const item of [p,weak]){let ledger={},sum=0;for(let month=1;month<=120;month++){const r=planSales([item],'bar',ledger,{month});assert(r.sold<=4);sum+=r.sold;ledger=r.ledger;}totals.push(sum);}assert(totals[0]>totals[1]);assert(totals[1]>0);
 for(const venue of ['retail','town-liquor','supermarket'])for(const item of [p,weak]){let ledger={};for(let month=1;month<=24;month++){const r=planSales([item],venue,ledger,{month});assert.deepEqual(r,legacyPlan([item],venue,ledger,{month}));ledger=r.ledger;}}
 const s=ready(),id=s.result.productId;assert(normalShopUnitPrice(s,id,'bar')>normalShopUnitPrice(s,id,'town-liquor'));
});
test('corrupt adoption, double reservations and unrecorded bar state are rejected',()=>{
 let s=ready(),id=s.result.productId;s=D.assignStoreProduct(s,{productId:id,shopId:'bar',count:5});assert.throws(()=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:2}));
 for(const mutate of [s=>s.alleyBar.version=2,s=>s.alleyBar.boundaryMonth++,s=>s.storeMarket.byShop.bar[id]++,s=>s.operations.splice(s.operations.findIndex(o=>o.key==='enable-alley-bar'),1)]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
});

test('install migration exposes recovery on save failure and publishes the bar only after commit',async()=>{
 const vm=await import('node:vm');
 const app=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const install=app.slice(app.indexOf('function installSession('),app.indexOf('\nfunction startNew(){'));
 for(const succeeds of [false,true]){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id);};
  const no=()=>{},reset={reset:no},old={core:{casks:[]},still:{phase:'ready'},operations:[],tastingId:null};
  const context={session:{game:old,caskSlots:[],userPaused:true,elapsed:0},dialogueNotice:reset,dialogueProjection:reset,countdown:{cancel:no},stopClock:no,manualDistilling:()=>false,preview:false,distillRoom:reset,scene:{resetMotion:no},marketUI:reset,placementUI:reset,feedbackComments:reset,automaticNews:reset,mapNoticeLoad:no,warehouseRoom:{select:no,selectedId:null},D:{shopDialogueMode:()=>true,marketRulesMode:()=>true,alleyBarMode:s=>!!s.alleyBar,enableAlleyBar:s=>({...s,alleyBar:{version:1}})},$:node,storageNotice:text=>node('storage-notice').textContent=text,render:no,schedule:no};
  context.saveCandidate=next=>{if(succeeds){context.committedSession={game:next};return true;}node('recovery').hidden=false;node('save-status').textContent='未保存';node('storage-notice').textContent='保存容量が足りません。';context.canSave=false;context.runtimeHalted=true;return false;};
  vm.runInNewContext(install+'\ninstallSession(session);',context);
  assert.equal(!!context.game.alleyBar,succeeds);assert.equal(!!context.committedSession.game.alleyBar,succeeds);
  assert.equal(node('recovery').hidden,succeeds);
  assert.equal(node('save-status').textContent,succeeds?'保存済み':'未保存');
  if(!succeeds){assert.equal(node('storage-notice').textContent,'保存容量が足りません。');assert.equal(context.canSave,false);assert.equal(context.runtimeHalted,true);}
 }
});

test('recall observer treats bar boundary as one transition and rollback as a read-only projection',()=>{const events=[],model=createObservedModel(D,e=>events.push(e)),old=source(),next=model.enableAlleyBar(old);assert.equal(events.length,1);assert.equal(events[0].operation.key,'enable-alley-bar');assert.deepEqual(model.preAlleyBarState(next),old);assert.equal(events.length,1);});
