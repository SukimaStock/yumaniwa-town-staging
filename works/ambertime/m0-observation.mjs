import {savedMarketSales,availableMarketShops} from './market-ui.mjs?v=sales-scroll-s1-1';
import {mapSalesProjection,mapShopDetail} from './map-sales-view.mjs?v=bar-v01-1';
import {mapShopPositions,drawGameMap,mapProgress} from './world-map-view.mjs?v=0.28.0-map';
import {retailSalePlan,ordinarySaleGroups} from './retail-sale-motion.mjs?v=count-linked-r1';
const esc=function(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));};
export function createM0Observation({document:doc,state,model,room,modal,art,stage}){
 const source=doc.getElementById('market-board'),scene=doc.getElementById('scene-root');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const outer=doc.createElement('section');outer.id='m0-observation';outer.hidden=true;
 outer.setAttribute('aria-label','販売室と地図を眺める');
 outer.innerHTML='<div class="m0-top"><div class="m0-rows" aria-label="注目店舗の棚"></div></div>'+
 '<div class="m0-drawer"><div class="m0-handle"><button type="button" data-m0="advance">地図をひらく</button><button type="button" data-m0="close" aria-label="地図を閉じる">×</button></div>'+
 '<div class="m0-map"><div class="m0-map-visual"><canvas width="144" height="144" role="img" aria-label="町の地図"></canvas><div class="m0-pins"></div></div>'+
 '<div class="m0-report" role="status" aria-live="polite"></div></div></div>';
 doc.body.append(outer);
 const rows=outer.querySelector('.m0-rows'),map=outer.querySelector('canvas'),pins=outer.querySelector('.m0-pins'),report=outer.querySelector('.m0-report');
 let mode='closed',selected='town-liquor',drag=null,animationEpoch=0;
 const active=()=>mode!=='closed'&&room()==='sales'&&!modal();
 const available=s=>availableMarketShops(s).map(x=>x.id);
 function align(){
  const r=source.getBoundingClientRect(),sr=scene.getBoundingClientRect();
  const left=r.width?r.left:sr.left+12,width=r.width||Math.max(280,sr.width-24);
  const top=r.height?r.top:sr.top+85,bottom=sr.bottom-10;
  Object.assign(outer.style,{left:left+'px',width:width+'px',top:top+'px',height:Math.max(300,bottom-top)+'px'});
  let viewport;try{viewport=JSON.parse(scene.dataset.viewport||'null');}catch{}
  if(viewport?.scale)outer.style.setProperty('--m0-scale',String(viewport.scale));
 }
 function cloneRows(){
  const originalShops=source.querySelectorAll('.market-shop');
  if(!originalShops.length){rows.replaceChildren();return;}
  const s=state(),list=['retail',selected].filter((x,i,a)=>a.indexOf(x)===i),frag=doc.createDocumentFragment();
  for(const id of list){
   const original=source.querySelector('[data-market-shop="'+id+'"]');if(!original)continue;
   const node=original.cloneNode(true);
   node.classList.add('m0-shop');node.removeAttribute('data-market-shop');node.dataset.m0Shop=id;
   node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
   node.querySelectorAll('button').forEach(button=>{
    const span=doc.createElement('span');span.className=button.className;span.innerHTML=button.innerHTML;
    if(button.hasAttribute('aria-hidden'))span.setAttribute('aria-hidden',button.getAttribute('aria-hidden'));
    button.replaceWith(span);
   });
   frag.append(node);
  }
  rows.replaceChildren(frag);
 }
 function showMap(){
  const s=state(),max=mapProgress(s).max,mapStage=Math.min(3,Math.max(2,Math.min(stage(),max)));
  drawGameMap(map,s,mapStage);
  const data=mapSalesProjection(s,mapStage),ids=available(s),positions=mapShopPositions(mapStage);
  const markers=[{id:'retail',name:'蒸留所',x:48,y:81},...data.pins];
  if(ids.includes('bar'))markers.push({id:'bar',name:'路地裏のバー',x:42,y:119,temporary:true});
  pins.innerHTML=markers.filter(p=>ids.includes(p.id)).map(p=>{
   const [x,y]=positions[p.id]??[p.x,p.y];
   return '<button type="button" class="m0-pin" data-m0-shop="'+esc(p.id)+'" aria-pressed="'+String(p.id===selected)+'"'+
    ' aria-label="'+esc(p.name+(p.temporary?'（仮配置）':''))+'" style="left:'+(x/144*100)+'%;top:'+(y/144*100)+'%">'+
    esc(p.id==='retail'?'蒸留所':p.name)+'</button>';
  }).join('');
  const p=selected==='retail'?data.retail:data.pins.find(p=>p.id===selected)??mapShopDetail(s,selected);
  const name=p?.name??({'retail':'自家販売','town-liquor':'町の酒店',supermarket:'スーパー',bar:'路地裏のバー'}[selected]??'取扱店');
  const stock=p?.currentStock,monthly=p?.monthlySold;
  const nums=(stock==null?'':'残 '+stock+'本')+(monthly==null?'':'　今月 '+monthly+'本');
  report.innerHTML='<div class="m0-report-heading"><strong>'+esc(name)+'</strong><span>'+esc(nums)+'</span></div>'+
   (p?.remark?'<p>「'+esc(p.remark)+'」</p>':'');
 }
 function update(){
  const canShow=room()==='sales'&&!modal()&&!!state();
  if(!canShow&&mode!=='closed'){mode='closed';animationEpoch++;}
  outer.hidden=!canShow||mode==='closed';if(outer.hidden)return;
  const choices=available(state());
  if(!choices.includes(selected))selected=choices.find(id=>id!=='retail')??'retail';
  align();outer.dataset.mode=mode;cloneRows();showMap();
  const button=outer.querySelector('[data-m0="advance"]');
  button.textContent=mode==='half'?'地図を全画面に　⌃':'地図を半開きに　⌄';
  button.setAttribute('aria-label',mode==='half'?'地図を全画面にする':'地図を半開きにする');
 }
 function setMode(next){if(!['closed','half','full'].includes(next))return;mode=next;animationEpoch++;update();}
 function consume(before,after){
  if(!active())return;
  const sales=savedMarketSales(before,after).filter(s=>s.shopId===selected);
  if(!sales.length)return;
  const originals=new Map();
  for(const sale of sales){
   const el=rows.querySelector('[data-m0-shop="'+sale.shopId+'"] .market-stock-row[data-wide], [data-m0-shop="'+sale.shopId+'"] #unused');
   const bottle=rows.querySelector('[data-m0-shop="'+sale.shopId+'"] .market-stock-row .market-bottle');
   if(bottle)originals.set(sale.productId,{rect:bottle.getBoundingClientRect(),html:bottle.innerHTML});
  }
  update();
  if(reduced.matches||doc.hidden)return;
  const token=++animationEpoch;
  const groups=ordinarySaleGroups(sales.map(s=>({shopId:s.shopId,productId:s.productId,units:s.count})));
  for(const group of groups){
   const origin=originals.get(group.productId),target=rows.querySelector('[data-m0-shop="'+group.shopId+'"] .market-store-icon');
   if(!origin||!target)continue;
   const r=origin.rect,t=target.getBoundingClientRect();
   const from={x:r.left+r.width/2,y:r.top+r.height/2},to={x:t.left+t.width/2,y:t.top+t.height/2};
   const flight=retailSalePlan(1,{from,to,grid:3,railY:t.top});
   for(const f of flight){
    if(token!==animationEpoch)break;
    const ghost=doc.createElement('span');ghost.className='m0-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=origin.html;
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    doc.body.append(ghost);
    if(!ghost.animate){ghost.remove();continue;}
    ghost.animate(f.frames,{duration:f.duration,delay:f.delay||0,fill:'none'}).finished.catch(()=>{}).finally(()=>ghost.remove());
   }
  }
 }
 outer.addEventListener('click',event=>{
  const pin=event.target.closest('[data-m0-shop]');if(pin){const id=pin.dataset.m0Shop;if(available(state()).includes(id)){selected=id;update();}return;}
  const action=event.target.closest('[data-m0]')?.dataset.m0;
  if(action==='advance')setMode(mode==='half'?'full':'half');
  if(action==='close')setMode('closed');
 });
 const handle=outer.querySelector('.m0-handle');
 handle.addEventListener('pointerdown',e=>{if(e.target.closest('[data-m0="close"]'))return;drag={id:e.pointerId,y:e.clientY};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const dy=e.clientY-drag.y;drag=null;if(Math.abs(dy)>28){e.preventDefault();setMode(dy<0?'full':'half');}});
 handle.addEventListener('pointercancel',()=>{drag=null;});
 window.addEventListener('resize',update);
 return {open:()=>setMode('half'),close:()=>setMode('closed'),setMode,update,consume,reset:()=>{mode='closed';selected='town-liquor';animationEpoch++;update();},get mode(){return mode;}};
}
