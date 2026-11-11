import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {computeViewport} from '../canvas-layout.mjs';
const js=readFileSync(new URL('../m0-observation.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../m0-observation.css',import.meta.url),'utf8');

test('M0 header removes only the decorative grip and preserves real native controls',()=>{
 const header=js.slice(js.indexOf('<div class="m0-handle">'),js.indexOf('<div class="m0-map">'));
 assert.doesNotMatch(js,/m0-grip/);assert.doesNotMatch(css,/m0-grip/);
 assert.match(header,/<select class="m0-stage" aria-label="地図の視点">/);
 assert.match(header,/class="m0-header-actions"/);
 assert.equal((header.match(/<button/g)??[]).length,2,'no balancing invisible button');
 assert.match(header,/data-m0="advance" aria-label="地図を全画面にする"/);
 assert.match(header,/data-m0="close" aria-label="地図を閉じる"/);
 assert.match(css,/\[data-mode=full\] \.m0-window-icon\{width:17px;height:2px;border:0;border-bottom:2px solid #f0e6c8\}/);
 assert.match(js,/data-m0="zoom-out" aria-label="地図を縮小">−/);
 assert.match(css,/\.m0-stage\{grid-column:2/);assert.match(css,/text-align:center;text-align-last:center;appearance:none/);
 assert.match(css,/background-image:linear-gradient/,'stage selection retains a visible chevron');
});

test('symmetric header tracks center stage over the whole header at all four phone sizes',()=>{
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(76px,112px\) minmax\(0,1fr\)/);
 assert.match(css,/\.m0-header-actions\{grid-column:3;justify-self:end;display:flex;min-width:88px\}/);
 for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){
  const v=computeViewport({width,height,dpr:3}),headerWidth=336*v.scale,stageWidth=112,side=(headerWidth-stageWidth)/2;
  assert(side>=88,'real action buttons fit without overlapping stage at '+width+'x'+height);
  assert.equal(side+stageWidth/2,headerWidth/2);
 }
});

function gestures(){
 const handlers={},capture=[],changes=[],handle={addEventListener:(type,fn)=>handlers[type]=fn,setPointerCapture:id=>capture.push(id)};
 const context={outer:{querySelector:()=>handle},setMode:mode=>changes.push(mode),mode:'half'};
 const code=js.slice(js.indexOf(" const handle=outer.querySelector('.m0-handle');"),js.indexOf(' // The map and hit targets belong to one transform layer;'));
 vm.runInNewContext('let suppressAdvance=false,drag=null;'+code,context);
 const event=(type,y,id=1)=>({pointerId:id,clientY:y,target:{closest:selector=>{if(selector==='button,select')return type==='header'?null:{};return null;}},preventDefault(){}});
 return {handlers,capture,changes,event};
}
test('header drag remains available while select and both right buttons never initiate it',()=>{
 for(const type of ['select','advance','close']){
  const g=gestures();g.handlers.pointerdown(g.event(type,100));g.handlers.pointerup(g.event(type,20));
  assert.equal(g.capture.length,0,type);assert.deepEqual(g.changes,[],type);
 }
 const g=gestures();g.handlers.pointerdown(g.event('header',100));g.handlers.pointerup(g.event('header',50));assert.deepEqual(g.changes,['full']);
 g.handlers.pointerdown(g.event('header',100));g.handlers.pointerup(g.event('header',145));assert.deepEqual(g.changes,['full','half']);
 g.handlers.pointerdown(g.event('header',100));g.handlers.pointercancel();g.handlers.pointerup(g.event('header',20));assert.equal(g.changes.length,2);
 assert.match(js,/if\(action==='advance'\)setMode\(mode==='half'\?'full':'half'\)/,'button click uses exactly the existing delegated action');
});

test('M0 upper shelf uses the shared market scope without making fallback map pins',()=>{
 const rows=js.slice(js.indexOf(' function syncRows(){'),js.indexOf(' function syncView(){'));
 assert.match(rows,/marketPartnerScopeForMap\(state\(\),readView\(\),availableMarketShops\(state\(\)\)\)/);
 assert.match(rows,/ids=scope\.shops\.map\(p=>p\.id\)/);
 assert.doesNotMatch(rows,/filter\(id=>available\(state\(\)\)\.includes\(id\)\)/);
 assert.match(rows,/caption\.textContent=scope\.label\.replace/);
 assert.match(css,/\.m0-scope-caption\{display:block;font-size:12px;line-height:12px/);
 const map=js.slice(js.indexOf(' function syncMap(){'),js.indexOf(' function clampPan(){'));
 assert.match(map,/projection=mapPartnerProjection\(s,level\)/);assert.doesNotMatch(map,/marketPartnerScopeForMap/);
});

test('real M0 shelf synchronizer follows fallback partners and explicit retail without changing map view',()=>{
 const source=js.slice(js.indexOf(' function syncRows(){'),js.indexOf(' function syncView(){'));
 let scope={shops:[{id:'retail'},{id:'town-liquor'}],stage:3,fallback:true,label:'町の取引先'},view={stage:4,selectedShop:null,transforms:{4:{zoom:1.5}}};
 const model={immutable:'game'},calls=[],nodes=[];
 const makeNode=id=>({id,innerHTML:id,attrs:{},caption:null,classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},querySelector(selector){if(selector==='.m0-scope-caption')return this.caption?{remove:()=>{this.caption=null;}}:null;if(selector==='.market-shop-name')return {append:caption=>{this.caption=caption;}};return null;}});
 const rows={dataset:{},querySelector:selector=>nodes.find(n=>selector.includes('"'+n.id+'"'))??null,replaceChildren(fragment){nodes.splice(0,nodes.length,...(fragment?.children??[]));}};
 const context={room:()=> 'sales',state:()=>model,readView:()=>view,outer:{dataset:{}},rows,rowKeys:new Map(),source:{querySelector:selector=>({innerHTML:selector})},availableMarketShops:()=>scope.shops,
  marketPartnerScopeForMap:(s,v,a)=>{calls.push({s,v,a});return scope;},staticShelf:id=>makeNode(id),partnerName:id=>id,
  doc:{createDocumentFragment:()=>({children:[],append(node){this.children.push(node);}}),createElement:()=>({setAttribute(){}})}};
 vm.runInNewContext('let lastStore=null,selected=null;'+source+';globalThis.select=id=>{selected=id;};',context);
 context.syncRows();assert.deepEqual(nodes.map(n=>n.id),['retail','town-liquor']);assert.equal(nodes[1].caption.textContent,'町');assert.equal(rows.dataset.displayStage,'3');assert.equal(calls[0].s,model);assert.equal(calls[0].v,view);
 const before=JSON.stringify(view);scope={shops:[{id:'retail'},{id:'trial-region-desk'}],stage:4,fallback:true,label:'地方の取引先'};context.syncRows();assert.deepEqual(nodes.map(n=>n.id),['retail','trial-region-desk']);assert.equal(nodes[1].caption.textContent,'地方');assert.equal(JSON.stringify(view),before,'M0 summary never rewrites stage or camera');
 scope={shops:[{id:'retail'}],stage:4,fallback:false,label:''};context.select('retail');context.syncRows();assert.deepEqual(nodes.map(n=>n.id),['retail'],'explicit self-sales does not resurrect remembered town store');
});

test('read-only clone removes the source details-chevron wrapper so icon plus scope stays 44px',()=>{
 const marketSource=readFileSync(new URL('../market-ui.mjs',import.meta.url),'utf8');
 assert.match(marketSource,/<span aria-hidden="true">\$\{symbolMarkup\('chevronRight'\)\}<\/span>/,'real market row retains its details affordance');
 const children=[];
 const icon={kind:'icon',height:32,innerHTML:'',querySelector:()=>null,remove(){children.splice(children.indexOf(this),1);}};
 const title={kind:'title',textContent:''};
 const chevron={kind:'chevron-wrapper',height:18,querySelector:selector=>selector==='[data-symbol="chevronRight"]'?{}:null,remove(){children.splice(children.indexOf(this),1);}};
 children.push(icon,title,chevron);
 const node={dataset:{},classList:{add(){}},removeAttribute(){},setAttribute(){},querySelectorAll(selector){return selector==='.market-shop-name > span[aria-hidden="true"]'?children.filter(el=>el===icon||el===chevron):[];},querySelector(selector){return selector==='.market-shop-title'?title:selector==='.market-store-icon'?icon:null;}};
 const context={source:{querySelector:()=>({cloneNode:()=>node})},partnerName:()=> '町の酒店',m0ShopGlyph:()=>'<svg aria-hidden="true"></svg>'};
 const source=js.slice(js.indexOf(' function staticShelf(id){'),js.indexOf(' function syncRows(){'));
 vm.runInNewContext(source,context);const cloned=context.staticShelf('town-liquor');
 assert.equal(cloned,node);assert(children.includes(icon));assert(!children.includes(chevron),'remove wrapper, not only SVG leaving a flex item');
 assert.equal(title.textContent,'町の酒店');assert.match(css,/\.market-shop-title\{display:none!important\}/);
 assert.match(css,/\.m0-scope-caption\{display:block;font-size:12px;line-height:12px/);
 assert.equal(children.filter(el=>el!==title).reduce((n,el)=>n+el.height,0)+12,44,'only icon32 and caption12 occupy the heading');
});
