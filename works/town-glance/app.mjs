import {town,project,boundedCamera} from './town.mjs';
const $=s=>document.querySelector(s), svg=$('#map'), scene=$('#scene');
let mode='A',destination='cafe',heading=0,overhead=false,revealed=false;
let camera=boundedCamera(1,0,0),dragged=false,gesture=null;
const pointers=new Map();
const p=(x,y,z=0)=>project(x,y,mode==='C',overhead,z);
const pt=(x,y,z=0)=>{const a=p(x,y,z);return `${a.x},${a.y}`;};
const polygon=(points,fill,extra='')=>`<polygon points="${points.map(a=>pt(...a)).join(' ')}" fill="${fill}" ${extra}/>`;
const line=(points,color,width,extra='')=>`<polyline points="${points.map(a=>pt(...a)).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const label=(x,y,text,size=18,extra='',z=0)=>{const a=p(x,y,z);return `<text x="${a.x}" y="${a.y}" text-anchor="middle" font-size="${size}" ${extra}>${text}</text>`;};
function block(o,color){
 const {x,y,w,d}=o,h=mode==='C'&&!overhead?o.h||0:0;
 let out='';
 if(h){out+=polygon([[x-w/2,y+d/2],[x+w/2,y+d/2],[x+w/2,y+d/2,h],[x-w/2,y+d/2,h]],'#bdb5a2');out+=polygon([[x+w/2,y-d/2],[x+w/2,y+d/2],[x+w/2,y+d/2,h],[x+w/2,y-d/2,h]],'#a6aa97');}
 return out+polygon([[x-w/2,y-d/2,h],[x+w/2,y-d/2,h],[x+w/2,y+d/2,h],[x-w/2,y+d/2,h]],color,'stroke="#f8f7ee" stroke-width="2"');
}
function render(){
 let out=polygon([[40,55],[550,55],[550,500],[40,500]],'#e4e8d8');
 if(mode==='C'&&!overhead){out=polygon([[40,500],[550,500],[550,500,-14],[40,500,-14]],'#c2cab4')+out;}
 out+=line([[520,55],[512,180],[529,335],[517,500]],'#c2dae0',17);
 if(mode==='A'){
  for(const x of [85,185,365,450])out+=line([[x,75],[x,490]],'#faf9f3',9);
  for(const y of [115,325,410,480])out+=line([[55,y],[495,y]],'#faf9f3',9);
  for(const x of [95,200,370,440])for(const y of [250,350,440]){
   if((x===200&&y===440)||(x===440&&y===250))continue;
   out+=block({x,y,w:24,d:20},'#d1d5c8');
  }
  out+=label(378,392,'駅前通り',10)+label(165,112,'塔の坂',10)+label(443,325,'川沿い通り',10);
 }
 out+=line([[town.road.left,town.road.y],[town.road.right,town.road.y]],'#b9bea9',town.road.width);
 out+=line([[town.road.left,town.road.y],[town.road.right,town.road.y]],'#e9e9da',1.5,'stroke-dasharray="8 8"');
 out+=label(130,190,'大通り',13);
 out+=block(town.park,'#a4bc89');
 for(const [x,y] of [[240,270],[275,257],[306,285]]){const a=p(x,y);out+=`<ellipse cx="${a.x}" cy="${a.y}" rx="11" ry="${mode==='C'&&!overhead?8:11}" fill="#729671"/>`;}
 out+=label(275,335,town.park.name,19);
 out+=block(town.station,'#c2c6b3')+label(120,345,town.station.name,19,'',mode==='C'&&!overhead?35:0);
 out+=block(town.tower,'#b5b99f')+label(435,65,town.tower.name,17,'',mode==='C'&&!overhead?65:0);
 for(const shop of town.shops){
  if(shop.id!==destination && mode!=='A')continue;
  const selected=shop.id===destination,foot=p(shop.x,shop.y),top=p(shop.x,shop.y,mode==='C'&&!overhead?shop.h:0);
  out+=`<g class="place" data-place="${shop.id}" role="button" tabindex="0" aria-label="${shop.name}の場所を見る">`;
  if(selected)out+=`<ellipse cx="${foot.x}" cy="${foot.y}" rx="36" ry="${mode==='C'&&!overhead?21:33}" fill="#d9924d" opacity=".17"/>`;
  out+=block(shop,selected?'#d99763':'#c9cdbf');
  if(selected)out+=`<circle cx="${top.x}" cy="${top.y-10}" r="6" fill="#a7572d" stroke="#fff5e5" stroke-width="2"/>`;
  out+=label(shop.x,shop.y+shop.d/2+25,shop.name,selected?19:12,selected?'class="selected-label"':'');
  // Generous transparent target; labels and footprint are also within the button group.
  out+=`<rect x="${top.x-36}" y="${top.y-30}" width="72" height="70" fill="transparent"/></g>`;
 }
 const a=p(town.you.x,town.you.y);
 out+=`<g id="you" transform="translate(${a.x} ${a.y})"><circle r="19" fill="#eef7f7"/><g id="you-heading" transform="rotate(${heading})"><path d="M 0 -27 L -11 -8 L 11 -8 Z" fill="#48859a"/></g><circle r="7" fill="#286c80" stroke="white" stroke-width="2"/></g>`;
 out+=label(town.you.x,town.you.y+37,'YOU',13,'class="you-label"');
 scene.innerHTML=out;
 const shop=town.shops.find(s=>s.id===destination);
 $('#place-name').textContent=shop.name;
 $('#place-detail').textContent=revealed?shop.relation:'店をタップして、この辺を眺める。';
 $('#confirm').textContent=revealed?'説明を閉じる':'場所を見る';
 $('#view-label').textContent={A:'道と区画を眺める',B:'知っている場所と眺める',C:overhead?'模型を真上から眺める':'街を小さな模型で眺める'}[mode];
 $('#overhead').hidden=mode!=='C';$('#overhead').setAttribute('aria-pressed',String(overhead));$('#overhead').textContent=overhead?'斜めから':'真上から';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 applyCamera();
}
function applyCamera(){ $('#camera').setAttribute('transform',`translate(${300+camera.x} ${280+camera.y}) scale(${camera.scale}) translate(-300 -280)`); }
function zoom(factor,anchor={x:300,y:280}){
 const scale=Math.max(.85,Math.min(2.4,camera.scale*factor)),ratio=scale/camera.scale;
 camera=boundedCamera(scale,(anchor.x-300)*(1-ratio)+camera.x*ratio,(anchor.y-280)*(1-ratio)+camera.y*ratio);applyCamera();
}
function local(e){const m=svg.getScreenCTM().inverse();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m);}
function snapshot(){const a=[...pointers.values()];return {camera:{...camera},center:a.length===1?a[0]:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},distance:a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0};}
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,local(e));svg.setPointerCapture(e.pointerId);if(pointers.size===1)dragged=false;gesture=snapshot();});
svg.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,local(e));const now=snapshot(),dx=now.center.x-gesture.center.x,dy=now.center.y-gesture.center.y;
 if(Math.hypot(dx,dy)>5||pointers.size>1)dragged=true;
 const scale=gesture.distance?gesture.camera.scale*now.distance/gesture.distance:gesture.camera.scale;
 const s=Math.max(.85,Math.min(2.4,scale)),ratio=s/gesture.camera.scale;
 camera=boundedCamera(s,now.center.x-300-(gesture.center.x-300-gesture.camera.x)*ratio,now.center.y-280-(gesture.center.y-280-gesture.camera.y)*ratio);applyCamera();
});
function release(e){
 const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-place]');
 pointers.delete(e.pointerId);if(pointers.size)gesture=snapshot();else{gesture=null;if(e.type==='pointerup'&&!dragged&&hit)choose(hit.dataset.place,true);}
}
svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
svg.addEventListener('lostpointercapture',e=>{if(pointers.delete(e.pointerId))gesture=pointers.size?snapshot():null;});
svg.addEventListener('keydown',e=>{const target=e.target.closest('[data-place]');if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(target.dataset.place,true);}});
svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.001),local(e));},{passive:false});
function choose(id,show=false){destination=id;revealed=show;$('#destination').value=id;render();}
$('#destination').addEventListener('change',e=>choose(e.target.value));
$('.modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){mode=b.dataset.mode;render();}});
$('#overhead').addEventListener('click',()=>{overhead=!overhead;render();});
$('#turn').addEventListener('click',()=>{heading=(heading+90)%360;$('#you-heading').setAttribute('transform',`rotate(${heading})`);});
$('#zoom-in').addEventListener('click',()=>zoom(1.2));$('#zoom-out').addEventListener('click',()=>zoom(1/1.2));
$('#reset').addEventListener('click',()=>{camera=boundedCamera(1,0,0);applyCamera();});
$('#confirm').addEventListener('click',()=>{revealed=!revealed;render();});
render();
