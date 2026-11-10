import {renderMap} from '../../world-map/v01/map.mjs';
import {mapObservationBounds} from '../../../world-map-view.mjs';
import {createShopRelationshipProjection} from './relationship-view.mjs';
import {BREATH_PATTERNS,BREATH_PERIOD_MS,BREATH_MAX_SCALE,breathParticipants,authoredSpriteBounds,alphaMaskShopCrop} from './breath-view.mjs';
import {SCENARIOS,fixtureState,SHOP_NAMES} from './fixtures.mjs';

const $=id=>document.getElementById(id);
const scenarioRoot=$('scenarios'),mapLayer=$('map-layer'),pinLayer=$('map-pins');
const mapWindow=$('map-window'),breathLayer=$('breath-layer'),canvas=$('map-canvas');
const originalBounds=mapObservationBounds(3);
const projection=createShopRelationshipProjection();
mapLayer.style.setProperty('--breath-period',BREATH_PERIOD_MS+'ms');
mapLayer.style.setProperty('--breath-scale',String(BREATH_MAX_SCALE));
let scenario=SCENARIOS[1],game=fixtureState(scenario),selected=scenario.selected;
let view='normal',style='together',zoom=1,pan={x:0,y:0};
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
// Presentation only: pulse the real shop's cut-out pixel art, or the
// existing corners when the bar has no authored building sprite yet.
let lastBreathKey=null;
function shopCutout(id){
 const b=authoredSpriteBounds(id,originalBounds);
 if(!b)return null;
 const small=document.createElement('canvas');
 small.width=b.w;small.height=b.h;
 const context=small.getContext('2d',{willReadFrequently:true});
 if(!context)return null;
 context.imageSmoothingEnabled=false;
 context.drawImage(canvas,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
 const pixels=context.getImageData(0,0,b.w,b.h);
 alphaMaskShopCrop(pixels.data,b.w,b.h);
 context.putImageData(pixels,0,0);
 small.className='breath-art';
 small.setAttribute('aria-hidden','true');
 return {bounds:b,canvas:small};
}
function clearBreathing(){
 breathLayer.replaceChildren();
 for(const pin of pinLayer.querySelectorAll('.pin')){
  pin.classList.remove('breath-marker');
  pin.style.removeProperty('--breath-delay');
 }
}
function syncBreathing(link){
 const participants=view==='relation'?breathParticipants(link,style,available()):[];
 const key=[scenario.id,view,selected,style,link?.eventId??'',...participants.map(p=>p.id+':'+p.delayMs)].join('|');
 if(key===lastBreathKey)return;
 lastBreathKey=key;
 clearBreathing();
 for(const p of participants){
  const art=shopCutout(p.id);
  if(art){
   const b=art.bounds;
   const spot=document.createElement('div');
   spot.className='breath-position';
   spot.style.left=(b.x+b.w/2)/144*100+'%';
   spot.style.top=(b.y+b.h/2)/144*100+'%';
   spot.style.width=b.w/144*100+'%';
   spot.style.height=b.h/144*100+'%';
   spot.style.setProperty('--breath-delay',p.delayMs+'ms');
   spot.append(art.canvas);breathLayer.append(spot);
  }else{
   // Existing temporary bar corners are the only visible element here.
   // Never draw a new bar or enlarge the 44px interaction target.
   const pin=[...pinLayer.querySelectorAll('.pin')].find(x=>x.dataset.shop===p.id);
   if(pin){
    pin.classList.add('breath-marker');
    pin.style.setProperty('--breath-delay',p.delayMs+'ms');
   }
  }
 }
 mapLayer.dataset.breathPaused=String(document.hidden);
}
function showOverview(){zoom=1;pan={x:0,y:0};updateTransform();}
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
  foot.textContent='普段は建物も地図も動きません。';follow.hidden=true;
 }else if(!link){
  message.textContent='この店に届いた、確認できる店舗間の口コミはありません。';
  foot.textContent='届いた記録がなければ、店は呼吸しません。';follow.hidden=true;
 }else{
  message.textContent=Math.floor(link.month/12)+'年'+link.month%12+'か月目、'+SHOP_NAMES[link.fromShopId]+'からの口コミが、この店に届きました。';
  const pattern=BREATH_PATTERNS.find(x=>x.id===style);
  foot.textContent=link.canDrawLink?({
   together:'関係する2店が、同時にゆっくり呼吸します。',
   reply:'紹介元に続いて、相手の店が少し遅れて呼吸します。',
   partner:'選択した店はそのまま。相手の店だけが呼吸します。'
  }[style]??pattern?.label):'紹介元の位置がまだありません。';
  follow.hidden=false;follow.textContent=SHOP_NAMES[link.fromShopId]+'を見に行く';
  follow.onclick=()=>selectShop(link.fromShopId);
 }
 syncBreathing(link);$('scenario-description').textContent=scenario.desc;
 $('plus').disabled=zoom>=3;$('minus').disabled=zoom<=1;
}
function setScenario(id){
 const found=SCENARIOS.find(x=>x.id===id);if(!found)return;
 lastBreathKey=null;
 scenario=found;game=fixtureState(found);selected=found.selected;showOverview();
 projection.reset();buildPins();render();
}
for(const item of SCENARIOS){
 const button=document.createElement('button');button.type='button';button.dataset.scenario=item.id;
 button.textContent=item.name;button.addEventListener('click',()=>setScenario(item.id));scenarioRoot.append(button);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{style=b.dataset.style;render();}));
$('overview').addEventListener('click',showOverview);
document.addEventListener('visibilitychange',()=>{mapLayer.dataset.breathPaused=String(document.hidden);});
window.addEventListener('pagehide',()=>{mapLayer.dataset.breathPaused='true';});
window.addEventListener('pageshow',()=>{mapLayer.dataset.breathPaused=String(document.hidden);});
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
