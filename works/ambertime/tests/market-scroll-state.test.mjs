import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketUI} from '../market-ui.mjs';
// Deterministic geometry double checks controller state, not browser layout.
function fixture(count=10){
 globalThis.window={addEventListener(){}};globalThis.matchMedia=()=>({matches:true,addEventListener(){}});
 const shops=[{id:'retail',name:'自家販売'},...Array.from({length:count},(_,i)=>({id:'shop-'+i,name:'店'+i}))];
 const s={core:{month:10,products:[]},storeMarket:{startedMonth:0},releases:[],brands:[],productsById:{},shop:{relations:[],deliveries:[]}};
 let markup='',top=0;const events=new Map(),docEvents=new Map();
 const rows=()=>[...markup.matchAll(/data-market-shop="([^"]+)"/g)].map(x=>x[1]).filter(id=>id!=='retail');
 const pane={id:'market-partners',classList:{contains:x=>x==='market-partners'},getBoundingClientRect:()=>({top:300,bottom:450}),get scrollTop(){return top;},set scrollTop(v){top=Math.max(0,Math.min(v,rows().length*100-150));},querySelectorAll:()=>rows().map((id,i)=>({dataset:{marketShop:id},getBoundingClientRect:()=>({top:300+i*100-top,bottom:400+i*100-top})}))};
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,contains:()=>false,get innerHTML(){return markup;},set innerHTML(v){markup=v;top=0;},querySelector:q=>q==='.market-partners'&&markup.includes('market-partners')?pane:null,querySelectorAll:()=>[],addEventListener:(name,fn,capture=false)=>events.set(name+(capture?':capture':''),fn)};
 const doc={body:{append(){}},getElementById:id=>id==='market-board'?root:null,activeElement:null,addEventListener:(name,fn)=>docEvents.set(name,fn)};
 const ui=createMarketUI({document:doc,model:{storeMarketRows:()=>[]},state:()=>s,art:()=>'',shopsForState:()=>shops,act(){},openStockist(){},openProduct(){}});
 return {ui,s,pane,root,events,docEvents,shops};
}
test('3/5/10 partner rows exist in one scroll region; fixed retail is outside',()=>{
 for(const count of [0,1,2,3,5,10]){const h=fixture(count);h.ui.update({visible:true});assert.equal([...h.root.innerHTML.matchAll(/data-market-shop=/g)].length,count+1);assert.equal(h.root.innerHTML.includes('market-partners'),count>0);if(count)assert(h.root.innerHTML.indexOf('data-market-shop="retail"')<h.root.innerHTML.indexOf('class="market-partners"'));}
});
test('repaint and modal preserve offset; room entry follows viewed shop through reorder',()=>{
 const h=fixture();h.ui.update({visible:true,sessionActive:true});h.pane.scrollTop=425;
 h.ui.update({visible:true,sessionActive:true,notice:'notice'});assert.equal(h.pane.scrollTop,425);
 h.ui.update({visible:false,sessionActive:true});h.s.shop.deliveries.push({shopId:'shop-0',month:10,count:1});h.ui.update({visible:true,sessionActive:true});assert.equal(h.pane.scrollTop,425);
 h.s.shop.deliveries.push({shopId:'shop-4',month:10,count:1});h.ui.update({visible:true,sessionActive:true});assert.equal(h.pane.scrollTop,425);
 h.ui.update({visible:false,sessionActive:false});h.ui.update({visible:true,sessionActive:true});
 assert.deepEqual(h.ui.diagnostics().order.slice(0,3),['retail','shop-0','shop-4']);assert.equal(h.pane.scrollTop,125);assert.equal(h.ui.diagnostics().anchor.id,'shop-4');
});
test('journal is scanned once per entry, including entry initially hidden by a modal',()=>{
 const h=fixture();let reads=0;Object.defineProperty(h.s.shop,'deliveries',{get(){reads++;return [];}});
 h.ui.update({visible:false,sessionActive:true});h.ui.update({visible:true,sessionActive:true});assert.equal(reads,1);
 for(let i=0;i<20;i++)h.ui.update({visible:true,sessionActive:true,notice:String(i)});assert.equal(reads,1);
 h.ui.update({visible:false,sessionActive:true});h.ui.update({visible:true,sessionActive:true});assert.equal(reads,1);
 h.ui.update({visible:false,sessionActive:false});h.ui.update({visible:true,sessionActive:true});assert.equal(reads,2);
});
test('pointer drag defers repaint, document release unlocks it, pointercancel suppresses click',()=>{
 const h=fixture();h.ui.update({visible:true});const old=h.root.innerHTML;
 h.events.get('pointerdown')({pointerId:1,isPrimary:true,clientX:0,clientY:0});h.events.get('pointermove')({pointerId:1,clientX:1,clientY:40});
 h.ui.update({visible:true,notice:'pending'});assert.equal(h.root.innerHTML,old);
 h.docEvents.get('pointerup')({pointerId:1});h.ui.update({visible:true});assert(h.root.innerHTML.includes('pending'));
 h.events.get('pointerdown')({pointerId:2,isPrimary:true,clientX:0,clientY:0});h.events.get('pointercancel')({pointerId:2});let blocked=false;
 h.events.get('click:capture')({detail:1,preventDefault(){},stopImmediatePropagation(){blocked=true;}});assert(blocked);
});
