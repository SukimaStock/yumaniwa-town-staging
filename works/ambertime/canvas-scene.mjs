import{computeViewport,layoutScene,projectRect,toLogical,hitTest}from'./canvas-layout.mjs?v=0.20-canvas-1';
import{barrel}from'./cask-glass-art.mjs?v=0.19-pixel-1';
import{stillArt,brandArt,bottleArt,glass}from'./room-object-art.mjs?v=0.19-room-1';
const $=id=>document.getElementById(id),ink='#f0e6c8',blue='#28285a',edge='#c8c8dc',shadow='#19141e';
const font='system-ui,-apple-system,"Noto Sans JP",sans-serif';
const spriteCache=new Map();
function sprite(markup,collection=1,active=false){
 const key=markup+':'+collection.toFixed(3)+':'+active;if(spriteCache.has(key))return spriteCache.get(key);
 const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement,[,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
 function paint(node,alpha=1){if(!active&&(node.classList?.contains('still-steam')||node.classList?.contains('distill-stream')))return;ctx.save();const opacity=Number(node.getAttribute('fill-opacity')??node.getAttribute('opacity')??1);ctx.globalAlpha=alpha*opacity;if(node.classList?.contains('receiver-liquid')){ctx.translate(0,46);ctx.scale(1,collection);ctx.translate(0,-46);}if(node.tagName==='rect'){ctx.fillStyle=node.getAttribute('fill');ctx.fillRect(...['x','y','width','height'].map(k=>Number(node.getAttribute(k))));}else for(const child of node.children)paint(child,alpha*opacity);ctx.restore();}
 paint(svg);if(spriteCache.size>100)spriteCache.clear();spriteCache.set(key,canvas);return canvas;
}
export class CanvasScene{
 constructor(){
  this.root=$('scene-root');this.canvas=$('scene-canvas');this.ctx=this.canvas.getContext('2d');this.world=document.createElement('canvas');this.world.width=120;this.world.height=214;this.worldCtx=this.world.getContext('2d');this.controlRoot=$('scene-controls');this.view=null;this.frame=0;this.pressed=null;
  for(const id of['room-nav','time-controls','cask-rack','product-shelf','shelf-pages','go-distill','start-distill','stop-distill','open-fill','open-ledger','open-history','open-settings','trade-info','shop-offer'])this.controlRoot.append($(id));
  $('scene-access').append($('spirit-readout'));for(const id of ['recovery','storage-notice'])this.root.append($(id));
  this.resize=()=>{const vv=window.visualViewport;
   // Fit ordinary resizes/keyboard changes, but let browser pinch magnify the scene.
   // Dialogs still follow the visible rectangle so their inputs/actions stay reachable.
   const visible={width:vv?.width??innerWidth,height:vv?.height??innerHeight,left:vv?.offsetLeft??0,top:vv?.offsetTop??0};
   const scene=vv?.scale>1.01?{width:document.documentElement.clientWidth,height:innerHeight,left:0,top:0}:visible;
   this.viewport=computeViewport({...scene,dpr:devicePixelRatio||1});const v=this.viewport;Object.assign(this.root.style,{left:v.left+'px',top:v.top+'px',width:v.width+'px',height:v.height+'px'});for(const[k,n]of Object.entries(visible))document.documentElement.style.setProperty('--view-'+k,n+'px');this.canvas.width=Math.round(v.width*v.dpr);this.canvas.height=Math.round(v.height*v.dpr);this.root.dataset.viewport=JSON.stringify(v);this.queue();};
  window.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('scroll',this.resize);this.resize();
  this.root.addEventListener('pointerdown',e=>{const p=toLogical(this.viewport,e.clientX,e.clientY),hit=hitTest(this.activeControls??[],p.x,p.y);this.root.dataset.lastPointer=JSON.stringify({...p,key:hit?.key??null});this.pressed=hit?.key;this.queue();});
  for(const event of['pointerup','pointercancel','focusin','focusout'])this.root.addEventListener(event,()=>{if(event.startsWith('pointer'))this.pressed=null;this.queue();});
 }
 update(view){this.view=view;this.layout=layoutScene(view);this.root.dataset.room=view.room;this.root.setAttribute('aria-label',({distill:'蒸留室',warehouse:'貯蔵庫',sales:'販売室'})[view.room]);this.root.dataset.sceneAnchors=JSON.stringify({floor:this.layout.floorY,shelf:this.layout.shelf,casks:this.layout.caskSlots,products:this.layout.productSlots,equipment:this.layout.equipment});$('scene-summary').textContent=[view.calendar,view.cash,view.generation,view.timeStatus,view.phaseSummary].filter(Boolean).join(' · ');$('scene-notice').textContent=view.notice??'';$('spirit-readout').setAttribute('aria-hidden',String(view.room!=='distill'));this.queue();}
 queue(){if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
 controls(){
  for(const node of this.controlRoot.querySelectorAll('button'))node.dataset.sceneVisible='false';
  const active=[];
  for(const rect of this.layout.controls){const node=document.querySelector(rect.selector);if(!node||node.closest('[hidden]'))continue;node.classList.add('scene-hit');node.dataset.sceneKey=rect.key;node.dataset.sceneVisible='true';const r=projectRect(this.viewport,rect);Object.assign(node.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});const name=node.textContent.replace(/\s+/g,' ').trim();if(!node.hasAttribute('data-cask-id')&&!node.hasAttribute('data-product-id'))node.setAttribute('aria-label',name);active.push({...rect,node,label:name});}
  this.activeControls=active;this.root.dataset.hitRegions=JSON.stringify(active.map(({node,label,...r})=>r));
 }
 drawWorld(){
  const c=this.worldCtx,v=this.view,l=this.layout;c.clearRect(0,0,120,214);c.fillStyle='#5a5a64';c.fillRect(0,0,120,214);
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x/3),Math.round(y/3),Math.round(w/3),Math.round(h/3));};
  for(let y=0;y<l.floorY;y+=15){r(0,y,360,3,'#282832');for(let x=(y/15%2)*24;x<360;x+=48)r(x,y,3,15,'#282832');}
  r(0,l.floorY,360,640-l.floorY,'#644632');for(let x=0;x<360;x+=36){r(x,l.floorY,3,640-l.floorY,'#3c281e');r(x+3,l.floorY,3,640-l.floorY,'#a0785a');}for(let y=l.floorY+90;y<640;y+=90)r(0,y,360,3,'#a0785a');r(0,l.floorY,360,6,shadow);
  const rail=(x,y,w)=>{r(x,y,w,3,'#a0785a');r(x,y+3,w,3,'#644632');r(x,y+6,w,3,shadow);};
  if(v.room==='warehouse'||v.room==='sales'){
   const s=l.shelf;r(s.x,s.y,6,s.h,'#a0785a');r(s.x+6,s.y,3,s.h,'#644632');r(s.x+s.w-6,s.y,6,s.h,'#644632');r(s.x+s.w,s.y,3,s.h,shadow);for(const y of s.rails)rail(s.x,y,s.w);
   const items=v.room==='warehouse'?v.casks:v.products,slots=v.room==='warehouse'?l.caskSlots:l.productSlots;
   items.forEach((item,i)=>{const pos=slots[i];if(!pos)return;const image=sprite(v.room==='warehouse'?barrel(item.type):(item.brand?brandArt(item.wood,item.brand):bottleArt(item.wood)));const x=Math.round((pos.x+pos.w/2)/3-image.width/2),y=pos.base/3-image.height+(v.room==='warehouse'?1:0);if(item.selected){r(x*3-6,y*3-6,image.width*3+12,image.height*3+6,'#f7cd58');r(x*3-3,y*3-3,image.width*3+6,image.height*3+3,'#28285a');}c.drawImage(image,x,y);if(v.room==='warehouse'&&v.inspectId===item.id){const sample=sprite(glass(item.wood));c.drawImage(sample,Math.round((pos.x+pos.w/2+27)/3),pos.base/3-sample.height);}});
  }else{
   const e=l.equipment;rail(36,e.benchY,288);r(36,e.benchY+9,9,468-e.benchY-9,'#a0785a');r(315,e.benchY+9,9,468-e.benchY-9,'#644632');const image=sprite(stillArt(),v.collection,v.phase==='distilling');c.drawImage(image,e.x/3,e.y/3);
  }
 }
 text(text,x,y,size=14,align='left',color=ink){const c=this.ctx;c.font=`${size}px ${font}`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(text,x,y);}
 lines(text,x,y,width,size=14,max=2,align='left'){
  const c=this.ctx;c.font=`${size}px ${font}`;const result=[];let line='';for(const ch of String(text)){if(c.measureText(line+ch).width>width&&line){result.push(line);line='';}line+=ch;}if(line)result.push(line);const shown=result.slice(0,max);if(result.length>max){let last=shown.at(-1);while(c.measureText(last+'…').width>width)last=last.slice(0,-1);shown[shown.length-1]=last+'…';}shown.forEach((s,i)=>this.text(s,x,y+i*(size+3),size,align));return shown.length;
 }
 window(x,y,w,h){const c=this.ctx;c.fillStyle=shadow;c.fillRect(x+3,y+3,w,h);c.fillStyle=edge;c.fillRect(x,y,w,h);c.fillStyle=blue;c.fillRect(x+3,y+3,w-6,h-6);}
 draw(){
  if(!this.view)return;this.controls();this.drawWorld();const c=this.ctx,v=this.viewport,view=this.view,l=this.layout;c.setTransform(v.dpr,0,0,v.dpr,0,0);c.fillStyle=shadow;c.fillRect(0,0,v.width,v.height);c.imageSmoothingEnabled=false;c.drawImage(this.world,0,0,120,640/3,v.offsetX,v.offsetY,360*v.scale,640*v.scale);c.save();c.translate(v.offsetX,v.offsetY);c.scale(v.scale,v.scale);
  this.window(6,6,348,51);this.text(view.calendar,15,28,16);this.text(view.cash,345,29,18,'right','#ffcf48');this.text(view.generation,15,49,12);this.text(view.timeStatus,345,49,13,'right');
  const items=view.room==='warehouse'?view.casks:view.room==='sales'?view.products:[],slots=view.room==='warehouse'?l.caskSlots:l.productSlots;
  items.forEach((item,i)=>{const p=slots[i];if(!p)return;const mid=p.x+p.w/2;const lines=this.lines(item.name,mid,p.base+24,132,13,view.room==='sales'?2:1,'center');this.text(view.room==='sales'?item.state:item.age,mid,p.base+24+lines*16,13,'center');});
  if(view.room==='warehouse'&&!items.length)this.text('まだ樽はありません。',180,330,14,'center');
  if(view.room==='sales'&&!items.length)this.text('瓶詰めした商品が、ここに並びます。',180,330,14,'center');
  if(view.room==='sales'&&view.pageCount>1)this.text(view.pageLabel,180,148,14,'center');
  if(view.room==='distill'&&view.spirit){const p=view.spirit;this.window(15,132,330,96);this.text(p.kind+' · '+p.volume,27,153,14);p.axes.forEach((a,i)=>{const y=179+i*27;this.text(a.label,27,y,13);c.fillStyle='#414644';c.fillRect(135,y-10,195,9);c.fillStyle='#c8b77e';c.fillRect(135,y-10,195*a.ratio,9);});if(!p.axes.length)this.lines(p.phrase,27,186,300,14,2);}
  if(view.room==='distill'&&view.phaseSummary)this.lines(view.phaseSummary,183,385,162,13,2);
  if(view.notice)this.lines(view.notice,15,view.room==='warehouse'?546:480,330,13,view.room==='warehouse'?3:1);
  for(const a of this.activeControls){if(a.key.startsWith('cask-')||a.key.startsWith('product-'))continue;const pressed=this.pressed===a.key||a.node.getAttribute('aria-pressed')==='true';this.window(a.x,a.y,a.w,a.h);if(pressed){c.fillStyle='#644632';c.fillRect(a.x+3,a.y+3,a.w-6,a.h-6);}if(a.node.disabled){c.fillStyle='#28285abb';c.fillRect(a.x+3,a.y+3,a.w-6,a.h-6);}const label=a.key==='trade-info'?'取引の確認':a.key==='shop-offer'?'申し出を確認':a.label;this.lines(label,a.x+a.w/2,a.y+25,a.w-12,14,2,'center');}
  c.restore();
 }
}
