import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {availableMarketShops,createMarketUI,visibleMarketRows,savedMarketSales} from '../market-ui.mjs';
import {regionalPartnerView} from '../regional-offer-view.mjs';
import {naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
const partnerId='trial-region-desk';
let fixture;
function natural(){fixture??=naturalDeliveryFixture(3);return structuredClone(fixture);}
// Minimal DOM adapter exercises the real native transaction handlers. It makes
// no claim about rendered geometry or touch behavior in a browser.
function harness({saved=true,reason=''}={}){
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});globalThis.window={addEventListener(){}};
 let current=natural(),save=saved;const events=[],notices=[],calls=[],listeners=new Map();
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,innerHTML:'',contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn,capture=false)=>listeners.set(name+(capture?':capture':''),fn)};
 const scene={dataset:{viewport:JSON.stringify({scale:1,offsetX:0,offsetY:0})}};
 const doc={hidden:false,activeElement:null,body:{append(){}},getElementById:id=>id==='market-board'?root:id==='scene-root'?scene:null,addEventListener(){}};
 const model={...D,regionalDeliveryQuote:(...args)=>{const q=D.regionalDeliveryQuote(...args);return reason?{...q,ok:false,reason}:q;}};
 for(const name of ['assignRegionalProduct','returnRegionalProduct','deliverRegionalProduct'])model[name]=(...args)=>{calls.push({name,value:structuredClone(args[1])});return D[name](...args);};
 const ui=createMarketUI({document:doc,model,state:()=>current,art:()=>'<svg></svg>',act:fn=>{const next=fn(current);if(save)current=next;return save;},openProduct(){},openStockist:id=>events.push(['info',id]),announce:t=>notices.push(t),announceSaved:t=>events.push(['saved',t])});
 const click=dataset=>listeners.get('click')({target:{closest:()=>({dataset,disabled:false})}});
 const pid=current.releases.at(-1).productId;ui.update({visible:true});click({marketRelease:String(pid)});
 return {ui,root,click,pid,events,notices,calls,state:()=>current,setSaved:v=>save=v};
}

test('only an enabled accepted regional contract appears beside the unchanged native sales destinations',()=>{
 const blank=D.newRegionalDeliveryDistillery(3);assert(!availableMarketShops(blank).some(s=>s.id===partnerId));
 const s=natural(),shops=availableMarketShops(s);assert.equal(shops.filter(s=>s.id===partnerId).length,1);assert.equal(shops.at(-1).name,'地域窓口');
 assert.equal(visibleMarketRows(s,D,partnerId).length,0);assert.equal(D.regionalDeliveryMode(s),true);
});

test('same bottle and1/5/all controls reserve physical stock; existing return pane cancels every pending allocation',()=>{
 const h=harness(),initial=h.state(),stock=initial.core.products.find(p=>p.id===h.pid).stock,cash=initial.core.cash;
 h.click({marketPlace:partnerId});assert.equal(D.regionalDeliveryRows(h.state(),partnerId)[0].count,1);assert.equal(h.calls.at(-1).value.count,1);
 h.click({marketPortion:'5'});h.click({marketPlace:partnerId});assert.equal(h.calls.at(-1).value.count,5);
 h.click({marketPortion:'all'});h.click({marketPlace:partnerId});assert.equal(D.regionalDeliveryRows(h.state(),partnerId)[0].count,stock);
 assert.equal(h.state().core.cash,cash);assert.equal(h.state().core.products.find(p=>p.id===h.pid).stock,stock);assert.match(h.root.innerHTML,/未納品/);
 h.click({marketStock:partnerId+':'+h.pid});assert(h.ui.diagnostics().editing.regional);assert.match(h.root.innerHTML,/data-market-confirm="deliver"/);assert.match(h.root.innerHTML,/data-market-confirm="return"/);
 h.click({marketCancel:'return'});assert.equal(D.regionalDeliveryRows(h.state(),partnerId)[0].count,stock);
 h.click({marketStock:partnerId+':'+h.pid});h.click({marketConfirm:'return'});assert.equal(D.regionalDeliveryRows(h.state(),partnerId).length,0);assert.equal(D.storeMarketInventory(h.state(),h.pid).hand,stock);assert.equal(h.state().core.cash,cash);
 assert.deepEqual(h.calls.at(-1).value.allocationIds,h.calls.filter(c=>c.name==='assignRegionalProduct').map(c=>c.value.allocationId));
});

test('explicit pending-row confirmation delivers only after saved action and exposes procurement separately from consumer sales',()=>{
 const h=harness(),before=h.state(),stock=before.core.products.find(p=>p.id===h.pid).stock;
 h.click({marketPortion:'5'});h.click({marketPlace:partnerId});const reserved=h.state(),q=D.regionalDeliveryQuote(reserved,h.pid,partnerId);
 h.click({marketStock:partnerId+':'+h.pid});h.click({marketConfirm:'deliver'});const after=h.state();
 assert.equal(after.core.cash,before.core.cash+5*q.unitPrice);assert.equal(after.core.products.find(p=>p.id===h.pid).stock,stock-5);assert.equal(D.regionalDeliveryRows(after,partnerId).length,0);
 const receipt=D.regionalDeliveryHistory(after,partnerId).at(-1);assert.equal(receipt.count,5);assert.equal(receipt.customerSales,null);assert.equal(receipt.id,q.nextDeliveryId);assert.equal(h.calls.at(-1).name,'deliverRegionalProduct');assert.deepEqual(h.calls.at(-1).value.allocationIds,q.allocationIds);
 assert.deepEqual(savedMarketSales(reserved,after),[]);assert.deepEqual(after.labConnection,reserved.labConnection);
 const view=regionalPartnerView(after,partnerId,D.regionalContract(after,partnerId));assert.match(view.body,/累計納品 5本/);assert.match(view.body,/顧客実売は不明/);assert.doesNotMatch(view.body,/準備中/);
 assert(h.events.some(e=>e[0]==='saved'&&e[1].includes('納品しました')));
});

test('failed save leaves reservation/payment uncommitted and a retry uses the same pending identities',()=>{
 const h=harness({saved:false}),original=h.state();h.click({marketPortion:'5'});h.click({marketPlace:partnerId});assert.equal(h.state(),original);assert.deepEqual(h.events,[]);
 h.setSaved(true);h.click({marketPlace:partnerId});h.click({marketStock:partnerId+':'+h.pid});const before=h.state(),cash=before.core.cash;
 h.setSaved(false);h.click({marketConfirm:'deliver'});assert.equal(h.state(),before);assert.equal(h.state().core.cash,cash);assert.equal(D.regionalDeliveryHistory(h.state(),partnerId).length,0);assert(h.ui.diagnostics().editing);
 const attempted=h.calls.at(-1).value;h.setSaved(true);h.click({marketConfirm:'deliver'});assert.deepEqual(h.calls.at(-1).value,attempted);assert.equal(D.regionalDeliveryHistory(h.state(),partnerId).length,1);
});

test('ineligible selected bottle shows a visible reason while keeping the contract row and existing information action',()=>{
 const h=harness({reason:'この契約のブランドのお酒を選んでください。'});h.click({marketPlace:partnerId});assert.match(h.root.innerHTML,/class="market-notice"/);assert.match(h.root.innerHTML,/この契約のブランド/);assert.equal(h.calls.length,0);
 h.click({marketDetails:partnerId});assert.deepEqual(h.events.at(-1),['info',partnerId]);
});
