import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import * as M from '../model.mjs';import * as R from '../rumor.mjs';import {normalShopOrders,planShopFulfillment} from '../../../../shop-demand.mjs';
test('A ordinary-store requests/plans are native functions on a common reference catalog',()=>{
 const s=M.advance(M.create({mode:'A',scenario:'parallel'}),12);s.month=13;
 const orders=normalShopOrders(M.nativeState(s,true),13);for(const o of orders){const p=planShopFulfillment(M.nativeState(s),13,o);assert(p.shipments.every(x=>x.count>0));assert.equal(o.month,13);}
 const b=M.advance(M.create({mode:'B',scenario:'parallel'}),12);b.month=13;assert.deepEqual(normalShopOrders(M.nativeState(b,true),13),orders);
});
test('B waits for the exact release, C/E never send an unrelated release; all conserve',()=>{
 for(const mode of ['A','B','C','D','E']){const s=M.advance(M.create({mode,scenario:'change',policy:'wait'}),132);assert(M.validate(s).ok);if(mode==='B')assert(s.shipments.filter(d=>d.to!=='department').every(d=>d.releaseId===d.anchorId));if(['C','E'].includes(mode))assert.equal(M.summary(s).mismatch,0);}
});
test('C near comparison preserves family/eight features and fixed anchor; exactrecipe simpler gate rejects changedcuts',()=>{
 const fruit=M.FLAVORS.find(f=>f.id==='fruit'),next=M.FLAVORS.find(f=>f.id==='fruit-near'),smoke=M.FLAVORS.find(f=>f.id==='smoke');assert(M.near(fruit,next,.06));assert(!M.near(fruit,smoke,.18));
 const mutated=structuredClone(next);mutated.profile.smoke=.9;assert(!M.near(fruit,mutated,.18));
 const s=M.advance(M.create({mode:'C',scenario:'variation'}),36);for(const r of Object.values(s.relations))assert.equal(r.anchorId,1);
});
test('super minimum10 is per release, held stock and next-month eligibility use native planner',()=>{
 const s=M.advance(M.create({mode:'A',scenario:'same'}),2);s.lots[0].stock=9;let native=M.nativeState(s);const order={shopId:'supermarket',month:2,count:10};assert.equal(planShopFulfillment(native,2,order).planned,0);
 s.lots[0].stock=10;native=M.nativeState(s);assert.equal(planShopFulfillment(native,2,order).planned,10);assert.equal(planShopFulfillment(native,2,order,{heldCounts:{1:5}}).planned,0);
 native.releases[0].bottledMonth=2;assert.equal(planShopFulfillment(native,2,order).planned,0);
 s.lots.push({...s.lots[0],id:2,stock:5});s.lots[0].stock=5;native=M.nativeState(s);native.shop.deliveries=[];assert.equal(planShopFulfillment(native,2,order).planned,0);
});
test('renewal treats nine remaining bottles as unshippable at supermarket, without merging lots',()=>{
 const s=M.advance(M.create({mode:'E',scenario:'same'}),13);const latest=s.lots.at(-1);s.relations.supermarket.selectedId=1;s.lots[0].stock=9;latest.stock=40;
 M.step(s);assert.equal(s.relations.supermarket.selectedId,latest.id);assert(s.lots[0].stock>=0);
});
test('decisions are explicit, no pre-contact manualtarget and JSON replay is exact',()=>{
 const s=M.create({scenario:'inquiry'});assert.throws(()=>M.selectRelease(s,'bar',1));M.advance(s,13);M.selectRelease(s,'town-liquor',1);const log=M.exportLog(s);assert.deepEqual(JSON.parse(JSON.stringify(M.exportLog(M.replay(JSON.parse(JSON.stringify(log)))))),JSON.parse(JSON.stringify(log)));const bad=structuredClone(log);bad.shipments[0].count++;assert.throws(()=>M.replay(bad));
});
function exposure(parts,kind){const r=R.createReaction(42);R.register(r,{externalId:1,product:M.FLAVORS[0].product,count:60});R.advanceReaction(r,3);R.receiveBatch(r,parts.map((count,i)=>({id:'q'+i,to:'town',releaseId:1,count})),kind);R.finishMonth(r,kind);return r;}
test('pooled/contact same-store split has one direct exposure and one opportunity at most',()=>{
 for(const kind of ['pooled','contact']){const a=exposure([6],kind),b=exposure([3,3],kind);assert.equal(a.exposures.length,b.exposures.length);assert.equal(a.exposures[0].strength,b.exposures[0].strength);assert.equal(a.town.pending.filter(x=>x.kind==='encounter').length,b.town.pending.filter(x=>x.kind==='encounter').length);}
 const a=exposure([6],'native'),b=exposure([3,3],'native');assert(b.exposures.reduce((n,e)=>n+e.strength,0)>a.exposures.reduce((n,e)=>n+e.strength,0));
});
test('all pre-existing main and Lab files including v01 remain byte-identical',()=>{
 const rows=execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)',M.BASE,'works/ambertime','works/ambertime-flavor-lab-v02'],{encoding:'utf8'}).trim().split('\n');for(const row of rows){const[sha,...parts]=row.split(' '),file=parts.join(' '),b=fs.readFileSync(file);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,file);}
});
