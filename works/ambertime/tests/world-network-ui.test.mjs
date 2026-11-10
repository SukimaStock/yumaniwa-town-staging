import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {availableMarketShops,createMarketUI} from '../market-ui.mjs';
import {mapPartnerProjection,marketPartnersForMap} from '../map-partners.mjs';
import {dailyMapProjection,normalizeMapView} from '../map-daily-view.mjs';
import {mapSceneryProjection} from '../map-scenery.mjs';
import {drawMapScenery,sceneryLayout} from '../map-scenery-view.mjs';
import {mapObservationBounds} from '../world-map-view.mjs';
import {regionalOfferView,regionalPartnerView} from '../regional-offer-view.mjs';
import {renderMap} from '../experiments/world-map/v01/map.mjs';
import {WORLD_CONTACTS} from '../world-network.mjs';
import {naturalWorldCraftFixture,WORLD_IDS} from './world-network-helpers.mjs';
const ids=rows=>rows.map(p=>p.id);
function pixels(stage){const result=new Map(),ctx={fillStyle:'',fillRect(x,y,w,h){for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)result.set(i+','+j,this.fillStyle);}};renderMap(ctx,stage);return result;}
function overlap(a,b){return a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];}
function harness(initial){
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});globalThis.window={addEventListener(){}};
 let s=initial,saved=true,view={stage:6,selectedShop:WORLD_IDS.overseas};const listeners=new Map();
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,innerHTML:'',contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn,capture=false)=>listeners.set(name+(capture?':capture':''),fn)};
 const scene={dataset:{viewport:JSON.stringify({scale:1,offsetX:0,offsetY:0})}},doc={hidden:false,activeElement:null,body:{append(){}},getElementById:id=>id==='market-board'?root:id==='scene-root'?scene:null,addEventListener(){}};
 const ui=createMarketUI({document:doc,model:D,state:()=>s,shopsForState:s=>marketPartnersForMap(s,view,availableMarketShops(s)),art:()=>'<svg></svg>',act:fn=>{const next=fn(s);if(saved)s=next;return saved;},openProduct(){},openStockist(){},announce(){},announceSaved(){}});
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset,disabled:false})}});
 const select=(stage,id=null)=>{view=normalizeMapView({...view,stage,selectedShop:id},6,ids(mapPartnerProjection(s,stage).partners));ui.update({visible:true});};
 ui.update({visible:true});return {ui,root,click,select,state:()=>s,setSaved:v=>saved=v};
}

test('contact state gates three map scopes; static definitions do not create partners or duplicate sales rows',()=>{
 const legacy=D.newRegionalDeliveryDistillery(3);for(const stage of [4,5,6])assert.deepEqual(mapPartnerProjection(legacy,stage).partners,[]);
 // Explicit presentation-only fixture for all three contracts; not a replayable career.
 const s=D.newWorldNetworkDistillery(3);s.regionalPartners.contracts=WORLD_CONTACTS.map(c=>({id:'regional-contract:'+c.id,partnerId:c.id,regionId:c.regionId,brandId:1,startedMonth:0}));
 const before=JSON.stringify(s),seen=[];
 for(const c of WORLD_CONTACTS){const p=mapPartnerProjection(s,c.stage);assert.deepEqual(ids(p.partners),[c.id]);seen.push(...ids(p.partners));assert.equal(p.partners[0].regional,true);assert.equal(p.partners[0].activity.customerSales,null);assert.equal(p.partners[0].activity.cumulativeDelivered,0);assert.equal(p.partners[0].canTrade,true);
  assert.deepEqual(ids(marketPartnersForMap(s,{stage:c.stage,selectedShop:c.id},availableMarketShops(s))),['retail',c.id]);
  assert.equal(normalizeMapView({stage:c.stage,selectedShop:c.id},6,[c.id]).selectedShop,c.id);
  assert.equal(normalizeMapView({stage:c.stage,selectedShop:WORLD_CONTACTS.find(x=>x.id!==c.id).id},6,WORLD_CONTACTS.map(x=>x.id)).selectedShop,null);
  assert.deepEqual(dailyMapProjection(s,c.stage).scenery,mapSceneryProjection(s,c.stage));
 }
 assert.equal(new Set(seen).size,3);assert.equal(JSON.stringify(s),before);
});

test('national and overseas schematic offices and decorations stay on unnamed land outside selection bounds',()=>{
 for(const c of WORLD_CONTACTS.filter(c=>c.stage>=5)){
  const bounds=mapObservationBounds(c.stage)[c.id],partner={id:c.id,bounds,box:true,flowerStage:2,butterfly:true},scenery={stage:c.stage,partners:[partner]},base=pixels(c.stage),drawn=[];
  const ctx={fillStyle:'',fillRect(x,y,w,h){drawn.push([x,y,w,h]);}};drawMapScenery(ctx,scenery);
  const layout=sceneryLayout(partner,c.stage);assert(layout);assert(drawn.length>10);
  for(const r of drawn){assert(r.every(n=>Number.isInteger(n)&&n%2===0));for(let x=r[0];x<r[0]+r[2];x++)for(let y=r[1];y<r[1]+r[3];y++)assert.equal(base.get(x+','+y),'#7d9d73',JSON.stringify({stage:c.stage,r,x,y}));}
  for(const r of drawn.slice(3))assert.equal(overlap(r,[bounds[0]-2,bounds[1]-2,bounds[2]+4,bounds[3]+4]),false,'boxes and flowers do not cover the office or its L corners');
  const [x,y]=layout.butterfly;for(let i=x;i<x+8;i++)for(let j=y;j<y+6;j++)assert.equal(base.get(i+','+j),'#7d9d73');
 }
});

test('natural overseas inquiry uses existing dialog and market operations with no extra country screen',()=>{
 let s=naturalWorldCraftFixture(27),offer=D.regionalOffers(s).find(o=>o.partnerId===WORLD_IDS.overseas);assert(offer);assert.equal(D.regionalContract(s,WORLD_IDS.national),null);
 const before=D.serializeDistillery(s),pending=mapPartnerProjection(s,6).partners[0];assert.equal(pending.status,'offer');assert.equal(pending.canTrade,false);assert.equal(mapSceneryProjection(s,6).partners[0].box,false);assert(regionalOfferView(s,offer));assert.equal(D.serializeDistillery(s),before);
 s=D.acceptRegionalOffer(s,offer.partnerId,offer.id);assert(regionalPartnerView(s,offer.partnerId,D.regionalContract(s,offer.partnerId)));
 const h=harness(s),id=s.result.productId;assert.deepEqual(h.ui.diagnostics().order,['retail',WORLD_IDS.overseas]);h.click({marketRelease:String(id)});
 for(const [choice,count]of [['1',1],['5',5],['all',5]]){h.click({marketPortion:choice});h.click({marketPlace:WORLD_IDS.overseas});assert.equal(D.regionalDeliveryRows(h.state(),WORLD_IDS.overseas)[0].count,count);h.click({marketStock:WORLD_IDS.overseas+':'+id});h.click({marketConfirm:'return'});assert.deepEqual(D.regionalDeliveryRows(h.state(),WORLD_IDS.overseas),[]);}
 h.click({marketPortion:'5'});h.click({marketPlace:WORLD_IDS.overseas});h.click({marketStock:WORLD_IDS.overseas+':'+id});const reserved=D.serializeDistillery(h.state());h.setSaved(false);h.click({marketConfirm:'deliver'});assert.equal(D.serializeDistillery(h.state()),reserved);h.setSaved(true);h.click({marketConfirm:'deliver'});
 const receipt=D.regionalDeliveryHistory(h.state(),WORLD_IDS.overseas).at(-1);assert.equal(receipt.count,5);assert.equal(receipt.customerSales,null);assert(h.state().labConnection.town.shipments.some(r=>r.id===receipt.id));
 h.select(3);assert(!h.ui.diagnostics().order.includes(WORLD_IDS.overseas));h.select(6,WORLD_IDS.overseas);assert(h.ui.diagnostics().order.includes(WORLD_IDS.overseas));
});

test('one partner remains recently active when other partners evict its global recent-eight cache entry',()=>{
 // Explicit presentation fixture for cache retention; not a validated native career.
 const s=D.newWorldNetworkDistillery(3);s.core.month=12;
 s.regionalPartners.contracts=WORLD_CONTACTS.slice(0,2).map(c=>({id:'regional-contract:'+c.id,partnerId:c.id,regionId:c.regionId,brandId:1,startedMonth:0}));
 const receipts=[{id:'regional-delivery:trial-region-desk:1',partnerId:WORLD_IDS.near,contractId:'regional-contract:'+WORLD_IDS.near,month:12,count:1,customerSales:null,allocationIds:[]}];
 for(let i=2;i<=10;i++)receipts.push({id:'regional-delivery:national-specialist-desk:'+i,partnerId:WORLD_IDS.national,contractId:'regional-contract:'+WORLD_IDS.national,month:12,count:1,customerSales:null,allocationIds:[]});
 s.regionalDeliveries.recentReceipts=receipts.slice(-8);s.regionalDeliveries.totalsByPartner={[WORLD_IDS.near]:{count:1,revenueCents:1},[WORLD_IDS.national]:{count:9,revenueCents:9}};
 s.operations.push(...receipts.map(receipt=>({key:'regional-deliver',value:{receipt}})));
 assert.equal(s.regionalDeliveries.recentReceipts.some(r=>r.partnerId===WORLD_IDS.near),false);
 const pin=mapPartnerProjection(s,4).partners[0];assert.equal(pin.activity.latestMonth,12);assert.equal(pin.activity.customerSales,null);assert.equal(mapSceneryProjection(s,4).partners[0].butterfly,true);
});
