// M0.7: view-only map drawer. All inputs are projections of native game state.
import {savedMarketSales,availableMarketShops} from './market-ui.mjs?v=sales-scroll-s1-1&map=map-partners-v01&world=world-network-v01&repair=ui3-20261111';
import {mapSceneryProjection} from './map-scenery.mjs?v=map-scenery-v01&world=world-network-v01';
import {syncSceneryLayer,installSceneryMotion} from './map-scenery-view.mjs?v=map-scenery-v01&world=world-network-v01';
import {mapPartnerProjection,mapPartnerDetail,marketPartnerScopeForMap} from './map-partners.mjs?v=map-partners-v01&world=world-network-v01&repair=ui3-20261111';
import {drawGameMap,mapProgress,mapObservationBounds,STAGES} from './world-map-view.mjs?v=m07-observation&map=map-partners-v01&scenery=map-scenery-v01&world=world-network-v01';
import {retailSalePlan,ordinarySaleGroups} from './retail-sale-motion.mjs?v=count-linked-r1';
import {SHOPS} from './shop-model.mjs?v=bar-v01-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shopNames=new Map([['retail','自家販売'],...SHOPS.map(s=>[s.id,s.name])]);
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
// M0-only presentation identity: types share glyphs as future shops are added.
// Formal shop names and IDs remain in shop-model.mjs and the lower map report.
const shopCategories=Object.freeze({'retail':'distillery','town-liquor':'liquor',supermarket:'supermarket',bar:'bar',department:'department'});
const categoryPixels=Object.freeze({
 distillery:['00001000000','00011100000','00011100000','00111111000','01111111110','01111111110','01111111110','01111111110','01101101110','01101101110','01111111110'],
 liquor:['00011000000','00011000000','00011000000','00111100000','00111100000','00111100000','00111100000','00111100000','00111100000','00111100000','00000000000'],
 supermarket:['00000000000','00100000100','00100000100','00111111100','01111111110','01111111110','01111111110','00111111100','00101010100','00100000100','00000000000'],
 bar:['01111111110','00111111100','00011111000','00001110000','00000100000','00000100000','00000100000','00011111000','00011111000','00000000000','00000000000'],
 department:['00000000000','01111111110','01111111110','01100100110','01100100110','01111111110','01100100110','01100100110','01111111110','01111111110','00000000000']
});
export const m0ShopCategory=id=>shopCategories[id]??'department';
export function m0ShopGlyph(id){
 const pixels=categoryPixels[m0ShopCategory(id)];
 const rectangles=pixels.map((row,y)=>[...row].map((cell,x)=>cell==='1'?'<rect x="'+x+'" y="'+y+'" width="1" height="1"/>':'').join('')).join('');
 return '<svg class="m0-shop-symbol" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true" focusable="false">'+rectangles+'</svg>';
}
export function mapSquare(width,height){
 const w=Math.max(0,width),h=Math.max(0,height),side=Math.min(w,h);
 return {side,left:(w-side)/2,top:(h-side)/2};
}
export function mapPanBounds(width,height,zoom){
 const side=Math.min(Math.max(0,width),Math.max(0,height))*Math.max(1,zoom);
 return {x:Math.max(0,(side-width)/2),y:Math.max(0,(side-height)/2)};
}
// Same authored 144×144 map coordinates as the building hit target.
// The visual brackets extend two source pixels beyond each side of the building.
export function mapCornerRect([x,y,w,h],margin=2){
 const left=clamp(x-margin,0,144),top=clamp(y-margin,0,144);
 const right=clamp(x+w+margin,0,144),bottom=clamp(y+h+margin,0,144);
 return [left,top,right-left,bottom-top];
}

export function createM0Observation({document:doc,state,room,modal,onModeChange=()=>{},view=null,onViewChange=()=>{},onInspect=()=>{},onTrade=()=>{}}){
 const source=doc.getElementById('market-board'),scene=doc.getElementById('scene-root');
 installSceneryMotion(doc);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const outer=doc.createElement('section');outer.id='m0-observation';outer.hidden=true;
 outer.setAttribute('aria-label','地図');
 outer.innerHTML=`<div class="m0-top"><div class="m0-rows" aria-label="注目する取扱店"></div></div>
 <div class="m0-drawer"><div class="m0-handle"><select class="m0-stage" aria-label="地図の視点">${STAGES.map((name,i)=>`<option value="${i+1}">${esc(typeof name==='string'?name:name.name??name.label??String(i+1))}</option>`).join('')}</select><div class="m0-header-actions"><button type="button" data-m0="advance" aria-label="地図を全画面にする"><span class="m0-window-icon" aria-hidden="true"></span></button><button type="button" data-m0="close" aria-label="地図を閉じる">×</button></div></div>
 <div class="m0-map"><div class="m0-map-window" tabindex="0" aria-label="地図。全画面では指や矢印キーで移動、拡大ボタンで拡大できます"><div class="m0-map-layer"><canvas width="144" height="144" role="img" aria-label="地図"></canvas><div class="map-scenery-butterflies" aria-hidden="true"></div><div class="m0-pins"></div></div></div>
 <div class="m0-zoom" hidden><button type="button" data-m0="zoom-in" aria-label="地図を拡大">＋</button><button type="button" data-m0="zoom-out" aria-label="地図を縮小">−</button></div>
 <div class="m0-report" role="status" aria-live="polite"></div></div></div>`;
 doc.body.append(outer);
 const rows=outer.querySelector('.m0-rows'),canvas=outer.querySelector('canvas'),pins=outer.querySelector('.m0-pins');
 const sceneryLayer=outer.querySelector('.map-scenery-butterflies');
 const report=outer.querySelector('.m0-report'),windowEl=outer.querySelector('.m0-map-window'),layer=outer.querySelector('.m0-map-layer');
 const zoomControls=outer.querySelector('.m0-zoom'),advance=outer.querySelector('[data-m0="advance"]');
 let mode='closed',selected=null,lastStore=null,drag=null,suppressAdvance=false;
 let localView={stage:3,selectedShop:null},stage=3,cameraStage=null;
 const stageControl=outer.querySelector('.m0-stage');
 const readView=()=>view?.()??localView;
 function publish(patch){localView={...readView(),...patch};onViewChange(localView);}
 function rememberCamera(){publish({transforms:{...(readView().transforms??{}),[stage]:{zoom,panX:pan.x,panY:pan.y}}});}
 function selectPartner(id){selected=id;publish({stage,selectedShop:id});update();}
 function partnerName(id){return mapPartnerProjection(state(),stage).partners.find(p=>p.id===id)?.name??mapPartnerDetail(state(),id)?.name??shopNames.get(id)??id;}
 const DRAWER_TWEEN_MS=240;
 const drawer=outer.querySelector('.m0-drawer');
 let opening=false,closing=false,hideTimer=null,suspendedMode=null,reportedOpen=null;
 function notifyMode(){const shown=mode!=='closed'||closing;if(shown!==reportedOpen){reportedOpen=shown;onModeChange(shown);}}
 let zoom=1,pan={x:0,y:0},paintKey='',pinKey='',rowKeys=new Map(),animationEpoch=0;
 let placementKey='',squareKey='',suppressPinClick=false;
 const pointers=new Map();let gesture=null;
 const available=s=>['retail',...mapPartnerProjection(s,stage).partners.map(p=>p.id)];
 const active=()=>mode!=='closed'&&room()==='sales'&&!modal();
 function align(){
  let v;try{v=JSON.parse(scene.dataset.viewport||'null');}catch{}
  const s=Number(v?.scale),r=scene.getBoundingClientRect();
  const scale=Number.isFinite(s)&&s>0?s:1;
  const x=Number.isFinite(v?.offsetX)?v.offsetX:r.left;
  const y=Number.isFinite(v?.offsetY)?v.offsetY:r.top;
  // Reserve a small upper reading area for the existing non-blocking
  // generation notice; keep the map's lower edge, hit areas and pan geometry.
  const reserve=doc.body.dataset.topImportant==='true'?90:0;
  const left=x+12*scale,top=y+(99+reserve)*scale,width=336*scale,height=(417-reserve)*scale;
  const key=[left,top,width,height,scale].join(':');
  if(key!==placementKey){
   Object.assign(outer.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
   outer.style.setProperty('--m0-scale',String(scale));placementKey=key;
  }
 }
 function staticShelf(id){
  const original=source.querySelector('[data-market-shop="'+id+'"]');
  if(!original)return null;
  const node=original.cloneNode(true);node.classList.add('m0-shop');node.removeAttribute('data-market-shop');node.dataset.m0Shop=id;
  node.querySelectorAll('.market-stock-row[id]').forEach(el=>{el.dataset.m0Product=el.id.split('-').at(-1);});
  node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  node.querySelectorAll('button').forEach(el=>{const span=doc.createElement('span');span.className=el.className;span.innerHTML=el.innerHTML;el.replaceWith(span);});
  // The source row's details chevron is not an action in this read-only clone.
  node.querySelectorAll('.market-shop-name > span[aria-hidden="true"]').forEach(el=>{if(el.querySelector('[data-symbol="chevronRight"]'))el.remove();});
  const name=node.querySelector('.market-shop-title');if(name)name.textContent=partnerName(id);
  const icon=node.querySelector('.market-store-icon');if(icon)icon.innerHTML=m0ShopGlyph(id);
  node.setAttribute('aria-label',partnerName(id));
  return node;
 }
 function syncRows(){
  const sales=room()==='sales';outer.dataset.originRoom=sales?'sales':'other';
  if(!sales){rows.replaceChildren();rowKeys.clear();return;}
  const scope=marketPartnerScopeForMap(state(),readView(),availableMarketShops(state())),ids=scope.shops.map(p=>p.id);rows.dataset.displayStage=String(scope.stage);if(!ids.includes(lastStore))lastStore=ids.find(id=>id!=='retail')??null;
  if(selected!=='retail'&&ids.includes(selected))lastStore=selected;
  const store=selected==='retail'||selected===null?lastStore:ids.includes(selected)?selected:null;
  const wanted=['retail',store].filter((id,i,a)=>id&&a.indexOf(id)===i);
  const next=doc.createDocumentFragment();const seen=new Set();
  for(const id of wanted){
   const original=source.querySelector('[data-market-shop="'+id+'"]');const markup=original?.innerHTML??'';
   let existing=rows.querySelector('[data-m0-shop="'+id+'"]');
   if(rowKeys.get(id)!==markup||!existing){const fresh=staticShelf(id);if(!fresh)continue;existing=fresh;rowKeys.set(id,markup);}
   existing.classList.toggle('m0-selected',selected===id);
   existing.querySelector('.m0-scope-caption')?.remove();
   const supplemented=scope.fallback&&id!=='retail';existing.classList.toggle('m0-scope-store',supplemented);
   existing.setAttribute('aria-label',partnerName(id)+(supplemented?' · '+scope.label:''));
   if(supplemented){const caption=doc.createElement('span');caption.className='m0-scope-caption';caption.textContent=scope.label.replace(/の取引先$/,'');caption.setAttribute('aria-label',scope.label);existing.querySelector('.market-shop-name')?.append(caption);}
   next.append(existing);seen.add(id);
  }
  rows.replaceChildren(next);rows.dataset.shopCount=String(seen.size);for(const id of [...rowKeys.keys()])if(!seen.has(id))rowKeys.delete(id);
 }
 function syncView(){
  const current=readView();stage=clamp(Number.isInteger(current.stage)?current.stage:3,1,6);
  const ids=available(state());selected=ids.includes(current.selectedShop)?current.selectedShop:null;
  if(current.selectedShop!==null&&current.selectedShop!==undefined&&!selected)publish({selectedShop:null});
  if(cameraStage!==stage){
   const camera=current.transforms?.[stage];zoom=clamp(Number.isFinite(camera?.zoom)?camera.zoom:1,1,3);
   pan={x:Number.isFinite(camera?.panX)?camera.panX:0,y:Number.isFinite(camera?.panY)?camera.panY:0};
   cameraStage=stage;pointers.clear();gesture=null;suppressPinClick=false;
  }
  stageControl.value=String(stage);
 }
 function syncMap(){
  const s=state(),level=stage,progress=mapProgress(s),projection=mapPartnerProjection(s,level),scenery=mapSceneryProjection(s,level,projection);
  const key=JSON.stringify([level,progress.max,[...progress.activeShops].sort(),scenery.staticKey]);
  if(key!==paintKey){drawGameMap(canvas,s,level,1,scenery);paintKey=key;}
  syncSceneryLayer(sceneryLayer,scenery,mode!=='closed'&&!closing&&!opening);
  const bounds=mapObservationBounds(level);
  const entries=[...(bounds.retail?[{id:'retail',name:'蒸留所',bounds:bounds.retail}]:[]),...projection.partners].filter(x=>x.bounds);
  const next=JSON.stringify([level,entries.map(p=>[p.id,p.name,p.status,p.bounds])]);
  if(pinKey!==next){
   const percent=value=>(value/144*100)+'%';
   pins.innerHTML=entries.map(({id,name,bounds:[x,y,w,h]})=>{
    const [left,top,width,height]=mapCornerRect([x,y,w,h]);
    return `<span class="m0-corners" data-m0-corners="${esc(id)}" aria-hidden="true" style="left:${percent(left)};top:${percent(top)};width:${percent(width)};height:${percent(height)}"></span>`+
     `<button type="button" class="m0-pin" data-m0-shop="${esc(id)}" style="left:${percent(x+w/2)};top:${percent(y+h/2)}" aria-label="${esc(name)}${id==='bar'?'（試作位置）':''}"></button>`;
   }).join('');
   pinKey=next;
  }
  for(const btn of pins.querySelectorAll('.m0-pin'))btn.setAttribute('aria-pressed',String(btn.dataset.m0Shop===selected));
  for(const corners of pins.querySelectorAll('.m0-corners'))corners.classList.toggle('m0-selected',corners.dataset.m0Corners===selected);
  const partner=projection.partners.find(p=>p.id===selected),detail=selected==='retail'?projection.retail:mapPartnerDetail(s,selected);
  const title=partner?.name??shopNames.get(selected)??(STAGES[level-1]?.name??STAGES[level-1]?.label??STAGES[level-1]);
  const stock=detail?.currentStock,monthly=detail?.monthlySold;
  const numbers=detail?.regional?`未納品 ${detail.pendingCount??0}本　納品累計 ${detail.totalDelivered??0}本`:[stock===null||stock===undefined?'':'残 '+stock+'本',monthly===null||monthly===undefined?'':'今月 '+monthly+'本'].filter(Boolean).join('　');
  const remark=partner?.status==='offer'?'取扱いの申し出':detail?.regional?'顧客実売は不明':detail?.remark??'';
  const actions=selected?'<div class="m0-report-actions"><button type="button" data-m0="inspect">'+(partner?.status==='offer'?'申し出を見る':'店情報')+'</button>'+((selected==='retail'||partner?.canTrade)?'<button type="button" data-m0="trade">販売室へ</button>':'')+'</div>':'';
  const text=title+'|'+numbers+'|'+remark+'|'+actions;
  if(report.dataset.content!==text){
   report.innerHTML='<div class="m0-report-heading"><strong>'+esc(title)+'</strong><span>'+esc(numbers)+'</span></div>'+(remark?'<p>'+esc(remark)+'</p>':'')+actions;
   report.dataset.content=text;
  }
 }
 function clampPan(){
  const r=windowEl.getBoundingClientRect(),bounds=mapPanBounds(r.width,r.height,zoom);
  pan.x=clamp(pan.x,-bounds.x,bounds.x);pan.y=clamp(pan.y,-bounds.y,bounds.y);
 }
 function transform(){
  if(mode!=='full'){layer.style.transform='none';return;}
  clampPan();layer.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
 }
 function layoutMap(){
  if(outer.hidden)return;
  const r=windowEl.getBoundingClientRect(),q=mapSquare(r.width,r.height);
  const key=[r.width,r.height,q.side].join(':');
  if(key!==squareKey){Object.assign(layer.style,{left:q.left+'px',top:q.top+'px',width:q.side+'px',height:q.side+'px'});squareKey=key;}
  transform();
 }
 // Leave the drawer mounted while it travels out. Hide only after the final frame;
 // that makes a close reversible, without a blank frame or replaying sales.
 function cancelHideTimer(){if(hideTimer!==null){clearTimeout(hideTimer);hideTimer=null;}}
 function finishClose(){
  cancelHideTimer();if(mode!=='closed')return;
  const restoreFocus=outer.contains(doc.activeElement);
  closing=false;opening=false;outer.hidden=true;sceneryLayer.dataset.active='false';notifyMode();
  if(restoreFocus)doc.getElementById('open-world-map')?.focus({preventScroll:true});
 }
 function update(){
  const blocked=!!modal(),hasGame=!!state();
  sceneryLayer.dataset.active=String(hasGame&&!blocked&&mode!=='closed'&&!closing&&!opening);
  if(!hasGame||blocked){
   if(blocked&&mode!=='closed')suspendedMode=mode;
   if(!hasGame)suspendedMode=null;
   if(mode!=='closed')animationEpoch++;
   mode='closed';opening=false;closing=false;cancelHideTimer();outer.hidden=true;notifyMode();return;
  }
  if(suspendedMode&&mode==='closed'){
   mode=suspendedMode;suspendedMode=null;opening=false;closing=false;
  }
  outer.hidden=mode==='closed'&&!closing&&!opening;
  notifyMode();
  if(outer.hidden)return;
  syncView();
  align();if(!opening)outer.dataset.mode=mode;syncRows();syncMap();
  advance.setAttribute('aria-label',mode==='half'?'地図を全画面にする':'地図を縮小する');
  zoomControls.hidden=mode!=='full';layoutMap();
 }
 function setMode(next){
  if(!['closed','half','full'].includes(next)||next===mode)return;
  const previous=mode,wasClosing=closing;
  const tween=!reduced.matches&&!doc.hidden&&!!state()&&!modal();
  cancelHideTimer();suspendedMode=null;mode=next;animationEpoch++;pointers.clear();gesture=null;
  if(next==='closed'){
   suppressAdvance=false;opening=false;closing=tween;
   update();
   if(closing)hideTimer=setTimeout(finishClose,DRAWER_TWEEN_MS+80);
   else finishClose();
   return;
  }
  closing=false;
  if(previous==='closed'&&!wasClosing&&tween){
   // Establish the offscreen starting frame before transitioning to the target.
   opening=true;outer.dataset.mode='closed';update();
   void drawer.offsetTop;
   opening=false;outer.dataset.mode=next;sceneryLayer.dataset.active='true';
   return;
  }
  opening=false;update(); // CSS continues from the current position if interrupted.
 }
 drawer.addEventListener('transitionend',event=>{
  if(event.target===drawer&&event.propertyName==='top'&&mode==='closed'&&closing)finishClose();
 });
 function consume(before,after){
  if(!active()||mode!=='half')return;
  const sales=savedMarketSales(before,after).filter(s=>s.shopId===selected);
  if(!sales.length)return;
  const originals=new Map();
  for(const sale of sales){
   const bottle=rows.querySelector('[data-m0-shop="'+sale.shopId+'"] .market-stock-row[data-m0-product="'+sale.productId+'"] .market-bottle');
   if(bottle)originals.set(sale.productId,{rect:bottle.getBoundingClientRect(),html:bottle.innerHTML});
  }
  update();if(reduced.matches||doc.hidden)return;
  const token=++animationEpoch;
  const groups=ordinarySaleGroups(sales.map(x=>({shopId:x.shopId,productId:x.productId,units:x.count})));
  for(const group of groups){
   const origin=originals.get(group.productId),dest=rows.querySelector('[data-m0-shop="'+group.shopId+'"] .market-store-icon');
   if(!origin||!dest||token!==animationEpoch)continue;
   const r=origin.rect,t=dest.getBoundingClientRect(),from={x:r.left+r.width/2,y:r.top+r.height/2},to={x:t.left+t.width/2,y:t.top+t.height/2};
   for(const flight of retailSalePlan(1,{from,to,grid:3,railY:t.top})){
    if(token!==animationEpoch)break;
    const ghost=doc.createElement('span');ghost.className='m0-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=origin.html;
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});doc.body.append(ghost);
    if(!ghost.animate){ghost.remove();continue;}
    ghost.animate(flight.frames,{duration:flight.duration,delay:flight.delay||0,fill:'none'}).finished.catch(()=>{}).finally(()=>ghost.remove());
   }
  }
 }
 function changeZoom(next){if(mode!=='full')return;zoom=clamp(next,1,3);transform();rememberCamera();}
 outer.addEventListener('click',event=>{
  const pin=event.target.closest('[data-m0-shop]');
  if(pin){if(!suppressPinClick&&available(state()).includes(pin.dataset.m0Shop)){selectPartner(pin.dataset.m0Shop);}suppressPinClick=false;return;}
  const action=event.target.closest('[data-m0]')?.dataset.m0;
  if(suppressAdvance&&action==='advance'){suppressAdvance=false;event.preventDefault();return;}
  if(action==='advance')setMode(mode==='half'?'full':'half');
  if(action==='close')setMode('closed');
  if(action==='zoom-in')changeZoom(zoom+.5);
  if(action==='zoom-out')changeZoom(zoom-.5);
  if(action==='inspect'&&selected)onInspect(selected);
  if(action==='trade'&&selected){setMode('closed');onTrade(selected);}
 });
 stageControl.addEventListener('change',()=>{const nextStage=clamp(Number(stageControl.value),1,6);rememberCamera();publish({stage:nextStage,selectedShop:null});update();});
 const handle=outer.querySelector('.m0-handle');
 handle.addEventListener('pointerdown',e=>{suppressAdvance=false;if(e.target.closest('button,select'))return;drag={id:e.pointerId,y:e.clientY,action:e.target.closest('[data-m0]')?.dataset.m0};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag,dy=e.clientY-d.y;drag=null;if(Math.abs(dy)>28){suppressAdvance=true;e.preventDefault();setMode(dy<0?'full':'half');}else if(d.action==='advance'){suppressAdvance=true;setMode(mode==='half'?'full':'half');}});
 handle.addEventListener('pointercancel',()=>{drag=null;});
 // The map and hit targets belong to one transform layer; no independent pin drift.
 windowEl.addEventListener('pointerdown',e=>{
  if(mode!=='full')return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pinId:e.target.closest('[data-m0-shop]')?.dataset.m0Shop});
  windowEl.setPointerCapture?.(e.pointerId);
  if(pointers.size===1)gesture={centroid:{x:e.clientX,y:e.clientY},distance:null,moved:false};
  else if(pointers.size>=2){const [a,b]=[...pointers.values()];gesture={centroid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y),moved:true};}
 });
 windowEl.addEventListener('pointermove',e=>{
  if(mode!=='full'||!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{...pointers.get(e.pointerId),x:e.clientX,y:e.clientY});
  const current=[...pointers.values()],center=current.length>1?{x:(current[0].x+current[1].x)/2,y:(current[0].y+current[1].y)/2}:current[0];
  if(!gesture){gesture={centroid:center,distance:null,moved:false};return;}
  const dx=center.x-gesture.centroid.x,dy=center.y-gesture.centroid.y;
  if(Math.abs(dx)+Math.abs(dy)>3)gesture.moved=true;
  pan.x+=dx;pan.y+=dy;
  if(current.length>1){const dist=Math.hypot(current[0].x-current[1].x,current[0].y-current[1].y);
   if(gesture.distance>0)zoom=clamp(zoom*dist/gesture.distance,1,3);
   gesture.distance=dist;gesture.moved=true;
  }else gesture.distance=null;
  gesture.centroid=center;transform();
 });
 const endPointer=e=>{if(!pointers.has(e.pointerId))return;const down=pointers.get(e.pointerId);const moved=!!gesture?.moved||Math.hypot(e.clientX-down.startX,e.clientY-down.startY)>6;pointers.delete(e.pointerId);
  if(e.type==='pointerup'&&!moved&&down.pinId&&available(state()).includes(down.pinId)){selectPartner(down.pinId);}
  if(moved)suppressPinClick=true;
  if(!pointers.size){gesture=null;rememberCamera();}else{const a=[...pointers.values()][0];gesture={centroid:a,distance:null,moved:true};}
 };
 windowEl.addEventListener('keydown',event=>{
  if(mode!=='full'||event.target!==windowEl)return;
  const delta={ArrowLeft:[24,0],ArrowRight:[-24,0],ArrowUp:[0,24],ArrowDown:[0,-24]}[event.key];
  if(delta){event.preventDefault();pan.x+=delta[0];pan.y+=delta[1];transform();rememberCamera();}
 });
 windowEl.addEventListener('pointerup',endPointer);windowEl.addEventListener('pointercancel',endPointer);
 window.addEventListener('resize',()=>{placementKey='';squareKey='';update();});
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>{squareKey='';layoutMap();}).observe(windowEl);
 return {open:()=>setMode('half'),close:()=>setMode('closed'),toggle:()=>setMode(mode==='closed'?'half':'closed'),setMode,update,consume,
 reset:()=>{cancelHideTimer();opening=false;closing=false;suspendedMode=null;mode='closed';notifyMode();selected=null;lastStore=null;localView={stage:3,selectedShop:null};cameraStage=null;zoom=1;pan={x:0,y:0};placementKey='';squareKey='';paintKey='';pinKey='';rowKeys.clear();animationEpoch++;update();},
 get mode(){return mode;},get isOpen(){return mode!=='closed'||closing;}};
}