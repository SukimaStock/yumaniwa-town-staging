import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {availableMarketShops,createMarketUI} from '../market-ui.mjs';
import {marketPartnerScopeForMap,marketPartnersForMap,mapPartnerProjection} from '../map-partners.mjs';
import {normalizeMapView} from '../map-daily-view.mjs';
import {naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
import {WORLD_CONTACTS} from '../world-network.mjs';
const ids=rows=>rows.map(p=>p.id),near='trial-region-desk',national='national-specialist-desk',overseas='overseas-import-desk';
const scope=(s,view)=>marketPartnerScopeForMap(s,view,availableMarketShops(s));
function townFixture(){const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;return D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)));}
function harness(initial){
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});globalThis.window={addEventListener(){}};
 let s=initial,saved=true,view={stage:6,selectedShop:null},editing=false;const listeners=new Map(),messages=[];
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,innerHTML:'',contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn,capture=false)=>listeners.set(name+(capture?':capture':''),fn)};
 const scene={dataset:{viewport:JSON.stringify({scale:1,offsetX:0,offsetY:0})}},doc={hidden:false,activeElement:null,body:{append(){}},getElementById:id=>id==='market-board'?root:id==='scene-root'?scene:null,addEventListener(){}};
 const ui=createMarketUI({document:doc,model:D,state:()=>s,scopeForState:s=>scope(s,view),art:()=>'<svg></svg>',act:fn=>{const next=fn(s);if(saved)s=next;return saved;},openProduct(){},openStockist(){},announce:text=>messages.push(text),announceSaved:text=>messages.push(text),setEditing:value=>editing=value});
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset,disabled:false})}});
 const select=(stage,selectedShop=null)=>{view=normalizeMapView({...view,stage,selectedShop},6,ids(mapPartnerProjection(s,stage).pins));ui.update({visible:true});};
 ui.update({visible:true});return {ui,root,click,select,state:()=>s,view:()=>view,messages,setSaved:value=>saved=value,editing:()=>editing};
}

test('town contract supplements empty wider views without changing stage, cameras, pins or formal state',()=>{
 const s=townFixture(),raw=D.serializeDistillery(s),view={stage:4,selectedShop:null,transforms:{4:{zoom:2,panX:12,panY:-9}}},viewText=JSON.stringify(view);
 for(const stage of [4,5,6]){const result=scope(s,{...view,stage});assert.deepEqual(ids(result.shops),['retail','town-liquor']);assert.equal(result.stage,3);assert.equal(result.requestedStage,stage);assert.equal(result.label,'町の取引先');assert.equal(result.fallback,true);assert.deepEqual(mapPartnerProjection(s,stage).pins,[]);}
 assert.equal(JSON.stringify(view),viewText);assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(ids(scope(s,{stage:1}).shops),['retail']);
});

test('nearest formally available scope wins and an offer alone never qualifies',()=>{
 // Presentation-only contract fixture, not a replayable career. Existing model
 // contract readers own qualification; no selected wine quote enters the scope.
 const s=D.newWorldNetworkDistillery(3);s.shop.relations.push({shopId:'town-liquor',brandId:1,startedMonth:0});
 const contract=id=>{const c=WORLD_CONTACTS.find(c=>c.id===id);s.regionalPartners.contracts.push({id:'contract:'+id,partnerId:id,regionId:c.regionId,brandId:1,startedMonth:0});};
 contract(near);assert.deepEqual(ids(scope(s,{stage:6}).shops),['retail',near]);assert.equal(scope(s,{stage:6}).label,'地方の取引先');
 contract(national);assert.deepEqual(ids(scope(s,{stage:6}).shops),['retail',national]);assert.equal(scope(s,{stage:6}).label,'全国の取引先');
 contract(overseas);const current=scope(s,{stage:6});assert.deepEqual(ids(current.shops),['retail',overseas]);assert.equal(current.fallback,false);assert.equal(current.label,'');
 const offers=D.newWorldNetworkDistillery(3);offers.shop.pendingOffers.push({id:1,shopId:'town-liquor',brandId:1,month:0});
 assert.deepEqual(ids(scope(offers,{stage:6}).shops),['retail']);
});

test('explicit retail and eligible partner choices win; stale IDs fall back without phantom shops',()=>{
 const s=naturalDeliveryFixture(3),raw=D.serializeDistillery(s);
 assert.deepEqual(ids(scope(s,{stage:6,selectedShop:'retail'}).shops),['retail']);
 assert.deepEqual(ids(scope(s,{stage:6,selectedShop:near}).shops),['retail',near]);
 const stale=scope(s,{stage:6,selectedShop:'removed-partner'});assert.deepEqual(ids(stale.shops),['retail',near]);assert.equal(stale.stage,4);
 const empty=D.newWorldNetworkDistillery(3);assert.deepEqual(ids(scope(empty,{stage:6,selectedShop:'removed-partner'}).shops),['retail']);
 const department=townFixture();department.shop.relations.push({shopId:'department',brandId:1,startedMonth:0});assert.deepEqual(ids(scope(department,{stage:3,selectedShop:'department'}).shops),['retail']);
 assert.equal(D.serializeDistillery(s),raw);
});

test('zero hand stock keeps the contract visible and the existing allocation reason intact',()=>{
 let s=naturalDeliveryFixture(3);const id=s.result.productId,q=D.regionalDeliveryQuote(s,id,near);
 s=D.assignRegionalProduct(s,{partnerId:near,productId:id,count:q.available,contractId:q.contractId,allocationId:q.nextAllocationId});
 assert.equal(D.storeMarketInventory(s,id).hand,0);assert.deepEqual(ids(scope(s,{stage:6}).shops),['retail',near]);
 const blocked=D.regionalDeliveryQuote(s,id,near);assert.equal(blocked.ok,false);assert.equal(blocked.reason,'手元の瓶を配分します。');
 const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
});

test('fallback town shelf still performs real allocation and return with no automatic transfer',()=>{
 const h=harness(townFixture()),pid=h.state().result.productId,raw=D.serializeDistillery(h.state());
 assert.match(h.root.innerHTML,/町の取引先/);assert.deepEqual(h.ui.diagnostics().order,['retail','town-liquor']);assert.equal(D.serializeDistillery(h.state()),raw);
 h.click({marketRelease:String(pid)});h.click({marketPortion:'5'});h.click({marketPlace:'town-liquor'});assert.equal(D.storeMarketInventory(h.state(),pid).shops['town-liquor'],5);
 h.click({marketStock:'town-liquor:'+pid});h.click({marketConfirm:'return'});assert.equal(D.storeMarketInventory(h.state(),pid).shops['town-liquor'],0);assert.equal(D.storeMarketInventory(h.state(),pid).hand,6);
 assert.equal(h.view().stage,6);const text=D.serializeDistillery(h.state());assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);
});

test('fallback regional scope preserves exact reservation, failed save, cancel and formal delivery IDs',()=>{
 const h=harness(naturalDeliveryFixture(3)),pid=h.state().result.productId;
 assert.match(h.root.innerHTML,/地方の取引先/);assert.deepEqual(h.ui.diagnostics().order,['retail',near]);
 h.click({marketRelease:String(pid)});h.click({marketPortion:'5'});h.click({marketPlace:near});const allocation=D.regionalDeliveryRows(h.state(),near)[0];assert.equal(allocation.count,5);
 h.click({marketStock:near+':'+pid});h.click({marketConfirm:'return'});assert.deepEqual(D.regionalDeliveryRows(h.state(),near),[]);
 h.click({marketPlace:near});h.click({marketStock:near+':'+pid});const before=h.state(),raw=D.serializeDistillery(before),q=D.regionalDeliveryQuote(before,pid,near);h.setSaved(false);h.click({marketConfirm:'deliver'});
 assert.equal(h.state(),before);assert.equal(D.serializeDistillery(h.state()),raw);assert(h.editing());h.setSaved(true);h.click({marketConfirm:'deliver'});
 const receipt=D.regionalDeliveryHistory(h.state(),near).at(-1);assert.equal(receipt.id,q.nextDeliveryId);assert.deepEqual(receipt.allocationIds,q.allocationIds);assert.equal(receipt.contractId,q.contractId);assert.equal(receipt.count,5);
 assert.equal(h.view().stage,6);const text=D.serializeDistillery(h.state());assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);
});

test('switching explicit target during fallback confirmation makes stale actions inert',()=>{
 const h=harness(naturalDeliveryFixture(3)),pid=h.state().result.productId;h.click({marketRelease:String(pid)});h.click({marketPortion:'5'});h.click({marketPlace:near});h.click({marketStock:near+':'+pid});assert(h.editing());
 const raw=D.serializeDistillery(h.state());h.select(6,'retail');assert.equal(h.editing(),false);h.click({marketConfirm:'deliver'});assert.equal(D.serializeDistillery(h.state()),raw);assert.equal(D.regionalDeliveryRows(h.state(),near)[0].count,5);assert.deepEqual(h.ui.diagnostics().order,['retail']);
});


test('a young selected bottle keeps its contracted fallback target and existing refusal reason',()=>{
 let s=naturalDeliveryFixture(3);s=D.startRangeDistillation(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');s=D.bottleBranded(s,s.core.casks.at(-1).id,{},5);
 const pid=s.result.productId,quote=D.regionalDeliveryQuote(s,pid,near);assert.equal(quote.ok,false);assert.equal(quote.reason,'熟成が6か月未満です。');
 const h=harness(s);h.click({marketRelease:String(pid)});const raw=D.serializeDistillery(h.state());h.click({marketPlace:near});
 assert.deepEqual(h.ui.diagnostics().order,['retail',near]);assert.match(h.root.innerHTML,/熟成が6か月未満です。/);assert.equal(D.serializeDistillery(h.state()),raw);assert.equal(h.view().stage,6);
});
