import {renderMap} from '../../world-map/v01/map.mjs';
import {mapObservationBounds} from '../../../world-map-view.mjs';
import {createShopRelationshipProjection} from './relationship-view.mjs';
import {paintTownContrast,focusViewport} from './focus-view.mjs';
import {SCENARIOS,fixtureState,SHOP_NAMES} from './fixtures.mjs';

const $=id=>document.getElementById(id);
const scenarioRoot=$('scenarios'),mapLayer=$('map-layer'),pinLayer=$('map-pins');
const mapWindow=$('map-window'),maskLayer=$('focus-mask'),canvas=$('map-canvas');
const maskContext=maskLayer.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const originalBounds=mapObservationBounds(3);
const projection=createShopRelationshipProjection();
let scenario=SCENARIOS[1],game=fixtureState(scenario),selected=scenario.selected;
let view='normal',style='contrast',zoom=1,pan={x:0,y:0};
const pointers=new Map();let movement=false,gesture=null;
const center=id=>{const r=originalBounds[id];return r?{x:r[0]+r[2]/2,y:r[1]+r[3]/2}:null;};
const available=()=>[...new Set(game.shop.relations.filter(r=>r.status!=='declined').map(r=>r.shopId))];
const relation=()=>projection.read(game,selected,{visibleShopIds:available(),mapShopIds:Object.keys(originalBounds)});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function updateTransform(){
 const side=Math.min(mapWindow.clientWidth,mapWindow.clientHeight),boundX=Math.max(0,(side*zoom-mapWindow.clientWidth)/2),boundY=Math.max(0,(side*zoom-mapWindow.clientHeight)/2);
 pan={x:clamp(pan.x,-boundX,boundX),y:clamp(pan.y,-boundY,boundY)};
 mapLayer.style.transform='translate(-50%,-50%) translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')';
 $('plus').disabled=zoom>=3;$('minus').disabled=zoom<=1;
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
// Two alternatives share the same factual relation: A pixel-stepped view
// mask, C a single authored-map camera move. Neither changes source pixels.
let lastVisualKey=null,focusEpoch=0,focusRaf=null,focusTimer=null,programmaticFocus=false;
function cancelFocusMotion(){
 focusEpoch++;
 if(focusRaf!==null)cancelAnimationFrame(focusRaf);
 if(focusTimer!==null)clearTimeout(focusTimer);
 focusRaf=null;focusTimer=null;
 mapLayer.classList.remove('focus-motion');
}
function resetViewpoint(){
 zoom=1;pan={x:0,y:0};programmaticFocus=false;updateTransform();
}
function applyFocus(link,{replay=false}={}){
 const from=link&&center(link.fromShopId),to=link&&center(link.selectedShopId);
 const valid=view==='relation'&&link?.canDrawLink&&from&&to;
 const key=valid?[scenario.id,selected,link.eventId,style].join(':'):'';
 if(!replay&&key===lastVisualKey)return;
 lastVisualKey=key;cancelFocusMotion();
 paintTownContrast(maskContext,valid&&style==='contrast'?[from,to]:[]);
 if(!valid||style==='contrast'){
  resetViewpoint();return;
 }
 // The camera move is pixel-stepped; the source map remains an intact sprite.
 resetViewpoint();
 const target=focusViewport(from,mapWindow.clientWidth,mapWindow.clientHeight);
 const epoch=focusEpoch;
 const go=()=>{
  if(epoch!==focusEpoch)return;
  zoom=target.zoom;pan=target.pan;programmaticFocus=true;
  if(!reduced.matches&&!document.hidden)mapLayer.classList.add('focus-motion');
  updateTransform();
  focusTimer=setTimeout(()=>{if(epoch===focusEpoch){mapLayer.classList.remove('focus-motion');focusTimer=null;}},760);
 };
 if(reduced.matches||document.hidden)go();
 else {void mapLayer.offsetWidth;focusRaf=requestAnimationFrame(go);}
}
function showOverview(){cancelFocusMotion();resetViewpoint();render();}
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
 const message=$('shop-message'),foot=$('map-foot'),follow=$('follow'),replay=$('replay');
 if(!isRelation){
  message.textContent='この店の様子を眺めています。関係を見ると、実際に届いた口コミの経緯を調べられます。';
  foot.textContent='町はいつもの姿です。';follow.hidden=true;replay.hidden=true;
 }else if(!link){
  message.textContent='この店に届いた、確認できる店舗間の口コミはありません。';
  foot.textContent='つながりの根拠がないときは地図を変えません。';follow.hidden=true;replay.hidden=true;
 }else{
  message.textContent=Math.floor(link.month/12)+'年'+link.month%12+'か月目、'+SHOP_NAMES[link.fromShopId]+'からの口コミが、この店に届きました。';
  foot.textContent=link.canDrawLink?(style==='contrast'?'明るく残る2か所が、今回のつながりです。':'紹介元の店へ、地図そのものが近づきます。'):'紹介元の位置がまだありません。';
  follow.hidden=false;follow.textContent=SHOP_NAMES[link.fromShopId]+'を見に行く';
  follow.onclick=()=>selectShop(link.fromShopId);
  replay.hidden=!(link.canDrawLink&&style==='focus');replay.textContent='もう一度近づく';
 }
 applyFocus(link);$('scenario-description').textContent=scenario.desc;
 $('plus').disabled=zoom>=3;$('minus').disabled=zoom<=1;
}
function setScenario(id){
 const found=SCENARIOS.find(x=>x.id===id);if(!found)return;
 cancelFocusMotion();lastVisualKey=null;
 scenario=found;game=fixtureState(found);selected=found.selected;resetViewpoint();
 projection.reset();buildPins();render();
}
for(const item of SCENARIOS){
 const button=document.createElement('button');button.type='button';button.dataset.scenario=item.id;
 button.textContent=item.name;button.addEventListener('click',()=>setScenario(item.id));scenarioRoot.append(button);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{style=b.dataset.style;render();}));
$('replay').addEventListener('click',()=>applyFocus(relation(),{replay:true}));
$('overview').addEventListener('click',showOverview);
reduced.addEventListener?.('change',()=>applyFocus(relation(),{replay:true}));
document.addEventListener('visibilitychange',()=>applyFocus(relation(),{replay:true}));
window.addEventListener('pagehide',cancelFocusMotion);
function changeZoom(n){cancelFocusMotion();programmaticFocus=false;zoom=clamp(n,1,3);updateTransform();render();}
$('plus').addEventListener('click',()=>changeZoom(zoom+.5));$('minus').addEventListener('click',()=>changeZoom(zoom-.5));
const points=()=>[...pointers.values()];
mapWindow.addEventListener('pointerdown',event=>{
 cancelFocusMotion();programmaticFocus=false;
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
window.addEventListener('resize',()=>{
 if(programmaticFocus&&view==='relation'&&style==='focus'){
  const link=relation(),from=link&&center(link.fromShopId);
  if(from){const target=focusViewport(from,mapWindow.clientWidth,mapWindow.clientHeight);zoom=target.zoom;pan=target.pan;}
 }
 updateTransform();
});
renderMap(canvas.getContext('2d',{alpha:false}),3);
setScenario('after');
