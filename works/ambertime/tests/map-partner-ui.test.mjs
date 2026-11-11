import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {availableMarketShops,createMarketUI} from '../market-ui.mjs';
import {marketPartnersForMap,mapPartnerProjection,marketPartnerScopeForMap} from '../map-partners.mjs';
import {normalizeMapView} from '../map-daily-view.mjs';
import {naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
const partner='trial-region-desk';
// DOM adapter runs production market handlers and real formal transactions.
// It is not a browser, layout, touch or screen-reader verification.
function harness(seed=3){
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});globalThis.window={addEventListener(){}};
 let current=naturalDeliveryFixture(seed),saved=true,view={stage:3,selectedShop:null},editing=false;
 const events=[],listeners=new Map();
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,innerHTML:'',contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn,capture=false)=>listeners.set(name+(capture?':capture':''),fn)};
 const scene={dataset:{viewport:JSON.stringify({scale:1,offsetX:0,offsetY:0})}};
 const doc={hidden:false,activeElement:null,body:{append(){}},getElementById:id=>id==='market-board'?root:id==='scene-root'?scene:null,addEventListener(){}};
 const ui=createMarketUI({document:doc,model:D,state:()=>current,scopeForState:s=>marketPartnerScopeForMap(s,view,availableMarketShops(s)),art:()=>'<svg></svg>',act:fn=>{const next=fn(current);if(saved)current=next;return saved;},openProduct(){},openStockist:id=>events.push(['info',id]),announce(){},announceSaved:t=>events.push(['saved',t]),setEditing:v=>editing=v});
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset,disabled:false})}});
 const select=(stage,id=null)=>{view=normalizeMapView({...view,stage,selectedShop:id},6,mapPartnerProjection(current,stage).partners.map(p=>p.id));ui.update({visible:true});};
 const pid=current.result.productId;ui.update({visible:true});click({marketRelease:String(pid)});
 return {ui,root,click,select,pid,events,state:()=>current,editing:()=>editing,setSaved:v=>saved=v,view:()=>view};
}

test('map selection highlights a real sales row and retains same-layer peers without mutating formal state',()=>{
 const h=harness(),raw=D.serializeDistillery(h.state());
 assert(!h.ui.diagnostics().order.includes(partner));assert(h.ui.diagnostics().order.includes('supermarket'));
 h.select(4,partner);assert.deepEqual(h.ui.diagnostics().order,['retail',partner]);assert.match(h.root.innerHTML,/地域窓口/);
 h.select(1);assert.deepEqual(h.ui.diagnostics().order,['retail']);assert.doesNotMatch(h.root.innerHTML,/data-market-place="trial-region-desk"/);
 for(const stage of [5,6]){h.select(stage);assert.deepEqual(h.ui.diagnostics().order,['retail',partner],'empty wider scales supplement the nearest contracted range');assert.match(h.root.innerHTML,/data-market-place="trial-region-desk"/);}
 h.select(3,'supermarket');assert.deepEqual(h.ui.diagnostics().order,['retail','town-liquor','supermarket','bar']);assert.match(h.root.innerHTML,/class="market-shop market-map-selected" data-market-shop="supermarket"/);assert.match(h.root.innerHTML,/data-market-details="supermarket"[^>]+aria-current="true"/);assert.equal((h.root.innerHTML.match(/aria-current="true"/g)??[]).length,1);
 h.select(3,'bar');assert.deepEqual(h.ui.diagnostics().order,['retail','town-liquor','supermarket','bar']);assert.match(h.root.innerHTML,/class="market-shop market-map-selected" data-market-shop="bar"/);assert.doesNotMatch(h.root.innerHTML,/class="market-shop market-map-selected" data-market-shop="supermarket"/);
 h.select(3,'retail');assert.deepEqual(h.ui.diagnostics().order,['retail','town-liquor','supermarket','bar']);assert.match(h.root.innerHTML,/class="market-shop market-map-selected" data-market-shop="retail"/);
 h.select(4,partner);assert.equal(h.view().selectedShop,partner);assert.equal(D.serializeDistillery(h.state()),raw);
});

test('natural seed3/6 map target uses unchanged1/5/all reservation and explicit cancel/deliver with cold restore',()=>{
 for(const seed of [3,6]){
  const h=harness(seed);h.select(4,partner);const initial=h.state(),stock=D.storeMarketInventory(initial,h.pid).hand,cash=initial.core.cash;
  h.click({marketPortion:'1'});h.click({marketPlace:partner});assert.equal(D.regionalDeliveryRows(h.state(),partner)[0].count,1);
  h.click({marketPortion:'5'});h.click({marketPlace:partner});assert.equal(D.regionalDeliveryRows(h.state(),partner)[0].count,6);
  h.click({marketPortion:'all'});h.click({marketPlace:partner});assert.equal(D.regionalDeliveryRows(h.state(),partner)[0].count,stock);assert.equal(h.state().core.cash,cash);
  h.click({marketStock:partner+':'+h.pid});h.click({marketConfirm:'return'});assert.equal(D.storeMarketInventory(h.state(),h.pid).hand,stock);assert.equal(D.regionalDeliveryRows(h.state(),partner).length,0);
  h.click({marketPortion:'5'});h.click({marketPlace:partner});const reserved=h.state(),q=D.regionalDeliveryQuote(reserved,h.pid,partner);
  h.click({marketStock:partner+':'+h.pid});h.click({marketConfirm:'deliver'});
  const receipt=D.regionalDeliveryHistory(h.state(),partner).at(-1);assert.equal(receipt.count,5);assert.equal(receipt.id,q.nextDeliveryId);assert.equal(receipt.contractId,D.regionalContract(initial).id);assert.equal(receipt.customerSales,null);
  assert.equal(h.state().core.cash,Math.round((cash+receipt.revenue)*100)/100);assert.deepEqual(h.state().labConnection,initial.labConnection);
  const raw=D.serializeDistillery(h.state());assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
  assert.equal(mapPartnerProjection(D.restoreDistillery(raw),4).partners[0].activity.cumulativeDelivered,5);
 }
});

test('switching selected map target closes stale pending editor without cancelling reserved physical bottles',()=>{
 const h=harness();h.select(4,partner);h.click({marketPortion:'5'});h.click({marketPlace:partner});h.click({marketStock:partner+':'+h.pid});assert(h.editing());
 const reserved=D.serializeDistillery(h.state());h.select(3,'supermarket');assert.equal(h.editing(),false);assert.equal(h.ui.diagnostics().editing,null);assert.equal(D.serializeDistillery(h.state()),reserved);assert.equal(D.regionalDeliveryRows(h.state(),partner)[0].count,5);
 h.click({marketConfirm:'deliver'});assert.equal(D.serializeDistillery(h.state()),reserved,'stale confirmation is inert');
 h.select(4,partner);h.click({marketStock:partner+':'+h.pid});assert(h.editing());h.click({marketCancel:'return'});assert.equal(D.serializeDistillery(h.state()),reserved);
});

test('save failure on map-selected regional delivery keeps the reservation and retry identity until real commit',()=>{
 const h=harness();h.select(4,partner);h.click({marketPortion:'5'});h.click({marketPlace:partner});h.click({marketStock:partner+':'+h.pid});
 const before=h.state(),raw=D.serializeDistillery(before),q=D.regionalDeliveryQuote(before,h.pid,partner);h.setSaved(false);h.click({marketConfirm:'deliver'});
 assert.equal(h.state(),before);assert.equal(D.serializeDistillery(h.state()),raw);assert.equal(D.regionalDeliveryHistory(h.state(),partner).length,0);assert(h.editing());
 h.setSaved(true);h.click({marketConfirm:'deliver'});assert.equal(D.regionalDeliveryHistory(h.state(),partner).length,1);assert.equal(D.regionalDeliveryHistory(h.state(),partner)[0].id,q.nextDeliveryId);
 h.click({marketConfirm:'deliver'});assert.equal(D.regionalDeliveryHistory(h.state(),partner).length,1);
});
