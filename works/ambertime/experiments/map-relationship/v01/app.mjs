import {renderMap} from '../../world-map/v01/map.mjs';
import {mapObservationBounds} from '../../../world-map-view.mjs';
import {createShopRelationshipProjection} from './relationship-view.mjs';
import {SCENARIOS,fixtureState,SHOP_NAMES} from './fixtures.mjs';

const $=id=>document.getElementById(id);
const scenarioRoot=$('scenarios'),mapLayer=$('map-layer'),pinLayer=$('map-pins');
const mapWindow=$('map-window'),lineLayer=$('line-layer'),canvas=$('map-canvas');
const originalBounds=mapObservationBounds(3);
const projection=createShopRelationshipProjection();
let scenario=SCENARIOS[1],game=fixtureState(scenario),selected=scenario.selected;
let view='normal',style='text',zoom=1,pan={x:0,y:0};
const pointers=new Map();let movement=false,gesture=null;
const center=id=>{const r=originalBounds[id];return r?{x:r[0]+r[2]/2,y:r[1]+r[3]/2}:null;};
const available=()=>[...new Set(game.shop.relations.filter(r=>r.status!=='declined').map(r=>r.shopId))];
const relation=()=>projection.read(game,selected,{visibleShopIds:available(),mapShopIds:Object.keys(originalBounds)});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function updateTransform(){
 const side=Math.min(mapWindow.clientWidth,mapWindow.clientHeight),boundX=Math.max(0,(side*zoom-mapWindow.clientWidth)/2),boundY=Math.max(0,(side*zoom-mapWindow.clientHeight)/2);
 pan={x:clamp(pan.x,-boundX,boundX),y:clamp(pan.y,-boundY,boundY)};
 mapLayer.style.transform='translate(-50%,-50%) translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')';
}
function selectShop(id){if(!available().includes(id))return;selected=id;render();}
function buildPins(){
 pinLayer.replaceChildren();
 for(const id of available()){
  const point=center(id);if(!point)continue;
  const btn=document.createElement('button');btn.type='button';btn.className='pin';btn.dataset.shop=id;
  btn.style.left=point.x/144*100+'%';btn.style.top=point.y/144*100+'%';
  btn.innerHTML='<span class="corner" aria-hidden="true"></span>';
  btn.setAttribute('aria-label',SHOP_NAMES[id]+'を選ぶ');
  btn.addEventListener('click',()=>selectShop(id));pinLayer.append(btn);
 }
}
function renderLine(e){
 lineLayer.replaceChildren();
 if(view!=='relation'||style!=='line'||!e?.canDrawLink)return;
 const from=center(e.fromShopId),to=center(e.selectedShopId);if(!from||!to)return;
 const xmlns='http://www.w3.org/2000/svg';
 const path=document.createElementNS(xmlns,'path');
 const arc=Math.max(10,Math.min(25,Math.abs(from.x-to.x)*.18));
 path.setAttribute('d','M'+from.x+' '+from.y+' Q'+(from.x+to.x)/2+' '+(Math.min(from.y,to.y)-arc)+' '+to.x+' '+to.y);
 path.setAttribute('stroke','#f1d184');path.setAttribute('stroke-width','2');path.setAttribute('stroke-dasharray','4 4');
 path.setAttribute('fill','none');path.setAttribute('stroke-linecap','square');lineLayer.append(path);
 for(const p of [from,to]){
  const dot=document.createElementNS(xmlns,'rect');
  dot.setAttribute('x',p.x-2);dot.setAttribute('y',p.y-2);
  dot.setAttribute('width','4');dot.setAttribute('height','4');dot.setAttribute('fill','#ffe5a1');lineLayer.append(dot);
 }
}
function render(){
 const link=relation(),isRelation=view==='relation';
 scenarioRoot.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario.id)));
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===style)));
 pinLayer.querySelectorAll('.pin').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shop===selected)));
 $('map-caption').textContent='町の地図　'+Math.floor(game.core.month/12)+'年'+game.core.month%12+'か月目';
 $('shop-title').textContent=SHOP_NAMES[selected]??'取扱店';
 $('detail-tag').textContent='取扱店';
 $('relation-controls').hidden=!isRelation;
 const message=$('shop-message'),foot=$('map-foot'),follow=$('follow');
 if(!isRelation){
  message.textContent='この店の様子を眺めています。関係を見ると、実際に届いた口コミの経緯を調べられます。';
  foot.textContent='通常時は、関係線を描きません。';follow.hidden=true;
 }else if(!link){
  message.textContent='この店に届いた、確認できる店舗間の口コミはありません。';
  foot.textContent='根拠がなければ、線も紹介先も表示しません。';follow.hidden=true;
 }else{
  message.textContent=Math.floor(link.month/12)+'年'+link.month%12+'か月目、'+SHOP_NAMES[link.fromShopId]+'からの口コミが、この店に届きました。';
  foot.textContent=style==='line'&&link.canDrawLink?'選んだ店につながる1本だけが見えています。':'線は隠したまま、つながりを読めます。';
  follow.hidden=false;follow.textContent=SHOP_NAMES[link.fromShopId]+'を見に行く';
  follow.onclick=()=>selectShop(link.fromShopId);
 }
 renderLine(link);$('scenario-description').textContent=scenario.desc;
 $('plus').disabled=zoom>=3;$('minus').disabled=zoom<=1;
}
function setScenario(id){
 const found=SCENARIOS.find(x=>x.id===id);if(!found)return;
 scenario=found;game=fixtureState(found);selected=found.selected;zoom=1;pan={x:0,y:0};
 projection.reset();buildPins();updateTransform();render();
}
for(const item of SCENARIOS){
 const button=document.createElement('button');button.type='button';button.dataset.scenario=item.id;
 button.textContent=item.name;button.addEventListener('click',()=>setScenario(item.id));scenarioRoot.append(button);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{style=b.dataset.style;render();}));
function changeZoom(n){zoom=clamp(n,1,3);updateTransform();render();}
$('plus').addEventListener('click',()=>changeZoom(zoom+.5));$('minus').addEventListener('click',()=>changeZoom(zoom-.5));
const points=()=>[...pointers.values()];
mapWindow.addEventListener('pointerdown',event=>{
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,shopId:event.target.closest('.pin')?.dataset.shop??null});
 mapWindow.setPointerCapture?.(event.pointerId);movement=false;
 const p=points();
 if(p.length===1)gesture={x:p[0].x,y:p[0].y,distance:0};
 if(p.length===2){gesture={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};movement=true;}
});
mapWindow.addEventListener('pointermove',event=>{
 if(!pointers.has(event.pointerId))return;
 const p=pointers.get(event.pointerId);p.x=event.clientX;p.y=event.clientY;
 const v=points(),cx=v.reduce((n,p)=>n+p.x,0)/v.length,cy=v.reduce((n,p)=>n+p.y,0)/v.length;
 if(v.some(p=>Math.hypot(p.x-p.startX,p.y-p.startY)>6))movement=true;
 if(gesture&&movement){
  pan.x+=cx-gesture.x;pan.y+=cy-gesture.y;
  if(v.length===2){
   const d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
   if(gesture.distance>0)zoom=clamp(zoom*d/gesture.distance,1,3);
   gesture.distance=d;
  }
  updateTransform();
 }
 gesture={x:cx,y:cy,distance:v.length===2?Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y):0};
});
const end=event=>{
 const down=pointers.get(event.pointerId);if(!down)return;
 const moved=movement||Math.hypot(event.clientX-down.startX,event.clientY-down.startY)>6;
 pointers.delete(event.pointerId);
 if(event.type==='pointerup'&&!moved&&down.shopId)selectShop(down.shopId);
 if(!pointers.size){movement=false;gesture=null;}
 else {movement=true;const a=points()[0];gesture={x:a.x,y:a.y,distance:0};}
};
mapWindow.addEventListener('pointerup',end);mapWindow.addEventListener('pointercancel',end);
window.addEventListener('resize',updateTransform);
renderMap(canvas.getContext('2d',{alpha:false}),3);
setScenario('after');
