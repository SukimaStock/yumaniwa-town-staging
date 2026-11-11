import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as D from '../partner-orders.mjs';
import {automaticEvents,noticeText,scopedNotices} from '../event-notices.mjs';
import {departmentAuditStates} from './map-department-fixtures.mjs';
import {advance} from './brands-helpers.mjs';

// A lawful current-game career supplies the actual offer, reserved five-bottle
// lot, monthly settlement receipt and adoption. No synthetic game state is saved.
const states=departmentAuditStates();
const completed=(before,after)=>automaticEvents(before,after).filter(e=>e.kind==='department-delivered');
const receipt=states.settled.shop.deliveries.find(d=>d.shopId==='department');
const raw=s=>D.serializeDistillery(s);

test('department acceptance and next-month reservation are not completion notices',()=>{
 const offered=states.offered,offer=offered.shop.offer;
 const accepted=D.acceptShop(offered,'department',offer.id);
 assert.equal(completed(offered,accepted).length,0);
 assert.equal(completed(offered,states.pending).length,0);
 assert.equal(states.pending.shop.deliveries.length,offered.shop.deliveries.length);
 assert.equal(states.pending.core.cash,offered.core.cash);
 assert.equal(states.pending.department.interests[0].pendingDelivery.count,5);
 assert.equal(states.pending.department.interests[0].pendingDelivery.dueMonth,states.pending.core.month+1);
});

test('only a newly committed receipt produces the exact department delivery reaction',()=>{
 const before=raw(states.pending),after=raw(states.settled),events=completed(states.pending,states.settled);
 assert.equal(events.length,1);
 const event=events[0],adoption=states.settled.department.adoptions.find(a=>a.deliveryId===receipt.id);
 assert(adoption);
 assert.deepEqual(event,{id:'department-delivery:'+receipt.id,kind:'department-delivered',receiptId:receipt.id,month:receipt.month,shopId:receipt.shopId,releaseId:receipt.releaseId,productId:receipt.productId,count:receipt.count,revenue:receipt.revenue});
 assert.equal(event.count,5);assert.equal(event.month,states.pending.department.interests[0].pendingDelivery.dueMonth);
 assert.equal(adoption.selectionId,receipt.selectionId);assert.equal(adoption.releaseId,event.releaseId);assert.equal(adoption.count,event.count);assert.equal(adoption.revenue,event.revenue);
 assert.equal(noticeText(events),'町のデパートへ5本納品しました。');
 assert.equal(raw(states.pending),before);assert.equal(raw(states.settled),after,'presentation never changes stock, cash or operation history');
 const oldStock=states.pending.core.products.find(p=>p.id===receipt.productId).stock;
 const remaining=states.settled.core.products.find(p=>p.id===receipt.productId)?.stock??0;
 const sold=states.settled.core.lastMonth.sales.filter(s=>s.id===receipt.productId).reduce((n,s)=>n+s.sold,0);
 assert.equal(oldStock-remaining,sold);assert(sold>=event.count);
});

test('cancelled, rejected or failed delivery operations create no completion receipt',()=>{
 const pending=states.pending,selection=pending.department.interests[0].selectionId;
 const cancelled=D.cancelDepartmentInterest(pending,selection),later=advance(cancelled,1);
 assert.equal(completed(pending,cancelled).length,0);assert.equal(completed(cancelled,later).length,0);
 assert.equal(later.shop.deliveries.filter(d=>d.selectionId===selection).length,0);
 const before=raw(states.offered);
 assert.throws(()=>D.acceptShopDelivery(states.offered,receipt.productId,4,'department',states.offered.shop.offer.id));
 assert.equal(raw(states.offered),before);assert.equal(completed(states.offered,states.offered).length,0);
});

test('replay, reload and subsequent months do not replay old delivery notifications',()=>{
 const saved=raw(states.settled),restored=D.restoreDistillery(saved);
 assert.equal(raw(restored),saved);
 assert.equal(completed(states.settled,restored).length,0);
 assert.equal(completed(restored,restored).length,0);
 assert.equal(completed(restored,advance(restored,1)).length,0);
 const pending=states.pending,restoredPending=D.restoreDistillery(raw(pending)),live=D.tickDistillery(pending),reloaded=D.tickDistillery(restoredPending);
 assert.equal(raw(reloaded),raw(live),'same pending promise settles with identical inventory, money, RNG and history after reload');
 assert.deepEqual(completed(pending,live),completed(restoredPending,reloaded));
});

test('existing notice lane deduplicates the same delivery without duplicating monthly sales',()=>{
 const events=automaticEvents(states.pending,states.settled),shows=[];
 const lane=scopedNotices({room:()=> 'sales',safe:()=>true,show:text=>shows.push(text),hide:()=>{},setTimer:()=>1,clearTimer:()=>{}});
 lane.push(events);lane.push(events);assert.equal(shows.length,1);assert.match(shows[0],/町のデパートへ5本納品しました。/);assert.doesNotMatch(shows[0],/販売 5本|発送 5本/);lane.reset();
 // Isolate the old monthly-summary display path with a read-only projection:
 // it includes this receipt in aggregate sales, but is never saved as a career.
 const before=structuredClone(states.pending),after=structuredClone(states.settled);delete before.freeAging;delete after.freeAging;
 after.core.lastMonth={...after.core.lastMonth,bottles:receipt.count+3,revenue:receipt.revenue+21};
 const legacyEvents=automaticEvents(before,after),sale=legacyEvents.find(e=>e.kind==='sales');
 assert.equal(completed(before,after).length,1);assert.equal(sale.count,3);assert.equal(sale.revenue,21);
 after.core.lastMonth={...after.core.lastMonth,bottles:receipt.count,revenue:receipt.revenue};
 assert(!automaticEvents(before,after).some(e=>e.kind==='sales'),'the same five are not repeated as aggregate sales');
});

test('actual saved-action branch publishes department completion only after successful save',()=>{
 const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function act(fn,'),end=source.indexOf('\nfunction actMarket(',start);
 assert(start>=0&&end>start);
 for(const saved of [false,true]){
  const pushed=[],context={game:states.pending,preview:false,canSave:true,userPaused:false,elapsed:0,runtimeHalted:false,
   countdown:{cancel(){}},stopClock(){},saveCandidate:()=>saved,render(){},schedule(){},restoreCommitted(){},storageNotice(){},
   automaticNews:{push:events=>pushed.push(...events)},automaticEvents,caskName:()=>'',soldOutLabel:()=>'',noteMapReach(){},
   next:states.settled};
  const result=runInNewContext(source.slice(start,end)+'\nact(()=>next)',context);
  assert.equal(result,saved);assert.equal(context.game,saved?states.settled:states.pending);
  assert.equal(pushed.filter(e=>e.kind==='department-delivered').length,saved?1:0);
 }
});
