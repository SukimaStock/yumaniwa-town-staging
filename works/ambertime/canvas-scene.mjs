import{RoomMotion}from'./room-motion.mjs?v=0.68-ui-refinements';
import{installSceneInput}from'./scene-input.mjs?v=0.21-space-1';
import{computeViewport,layoutScene,projectRect,toLogical,hitTest,noticeLayout,collectionGeometry}from'./canvas-layout.mjs?v=distill-ui-r1';
import{barrel}from'./cask-glass-art.mjs?v=0.58-first-brand';
import{stillArt,brandArt,bottleArt,glass}from'./room-object-art.mjs?v=0.62-bottle-shelf-wall';
const $=id=>document.getElementById(id),ink='#f0e6c8',shadow='#19141e';
import{FONT_STACK,fontReady}from'./font-loader.mjs?v=0.35-font-1';
import{BODY_SIZE,pixelTypography,textRuns,textPieces,numberMarkup}from'./text-metrics.mjs?v=0.24-type-ui-1';
import{drawSymbol,symbolMarkup}from'./pixel-symbols.mjs?v=start-map-ui-r1';
import{uiText}from'./ui-text.mjs?v=stage4-r2';
const spriteCache=new Map();
function sprite(markup,collection=1,active=false,frame=0){
 const key=markup+':'+collection.toFixed(3)+':'+active+':'+frame;if(spriteCache.has(key))return spriteCache.get(key);
 const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement,[,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.contentBottom=Number(svg.getAttribute('data-content-bottom')??h);const ctx=canvas.getContext('2d');
 function paint(node,alpha=1){if(!active&&(node.classList?.contains('still-steam')||node.classList?.contains('distill-stream')))return;ctx.save();if(active&&frame===1){if(node.classList?.contains('distill-stream'))ctx.translate(0,1);if(node.classList?.contains('still-steam'))ctx.translate(0,-1);}const opacity=Number(node.getAttribute('fill-opacity')??node.getAttribute('opacity')??1);ctx.globalAlpha=alpha*opacity;if(node.classList?.contains('receiver-liquid')){const bottom=Number(node.getAttribute('data-liquid-bottom'));ctx.translate(0,bottom);ctx.scale(1,collection);ctx.translate(0,-bottom);}if(node.tagName==='rect'){ctx.fillStyle=node.getAttribute('fill');ctx.fillRect(...['x','y','width','height'].map(k=>Number(node.getAttribute(k))));}else for(const child of node.children)paint(child,alpha*opacity);ctx.restore();}
 paint(svg);if(spriteCache.size>100)spriteCache.clear();spriteCache.set(key,canvas);return canvas;
}
export class CanvasScene{
 constructor(){
  this.root=$('scene-root');this.canvas=$('scene-canvas');this.ctx=this.canvas.getContext('2d');this.world=document.createElement('canvas');this.world.width=120;this.world.height=214;this.worldCtx=this.world.getContext('2d');this.controlRoot=$('scene-controls');this.view=null;this.frame=0;this.pressed=null;this.fontSettled=false;this.selectionTimer=null;this.hintTimer=null;this.motionTimer=null;this.motion=new RoomMotion();this.idleSince=performance.now();this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');this.resetIdle=()=>{this.idleSince=performance.now();this.queue();};this.reducedMotion.addEventListener('change',this.resetIdle);
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,this.resetIdle,true);
  document.addEventListener('visibilitychange',this.resetIdle);
  window.addEventListener('pagehide',()=>{this.suspended=true;this.stopDrawing();});
  window.addEventListener('pageshow',()=>{this.suspended=false;this.resetIdle();});
  new MutationObserver(()=>this.queue()).observe($('action-dialog'),{attributes:true,attributeFilter:['open']});
  fontReady.then(()=>{this.fontSettled=true;this.queue();});
  document.addEventListener('amber-font-change',()=>this.queue());
  for(const id of['room-nav','time-controls','cask-rack','product-shelf','shelf-pages','go-distill','start-distill','stop-distill','open-fill','open-ledger','shop-offer'])this.controlRoot.append($(id));
  $('management-controls').prepend($('open-ledger'));$('management-controls').append($('shop-offer'),$('open-aux-menu'));
  for(const id of ['toggle-speed','open-settings'])$('aux-panel').append($(id));
  $('scene-access').append($('spirit-readout'));for(const id of ['recovery','storage-notice'])document.body.append($(id));
  const close=$('close-dialog');close.innerHTML=symbolMarkup('close');close.setAttribute('aria-label','閉じる');
  const observer=new MutationObserver(()=>{observer.disconnect();numberMarkup($('action-dialog'));this.alignDialog();observer.observe($('action-dialog'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style']});});observer.observe($('action-dialog'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style']});
  this.alignDialog=()=>{const dialog=$('action-dialog');if(!dialog.open)return;const vv=window.visualViewport,d=devicePixelRatio||1,r=dialog.getBoundingClientRect();Object.assign(dialog.style,{transform:'none',left:Math.round(((vv?.offsetLeft??0)+(vv?.width??innerWidth)/2-r.width/2)*d)/d+'px',top:Math.round(((vv?.offsetTop??0)+(vv?.height??innerHeight)/2-r.height/2)*d)/d+'px'});};
  new ResizeObserver(()=>this.alignDialog()).observe($('action-dialog'));
  this.resize=()=>{const vv=window.visualViewport;
   // Fit ordinary resizes/keyboard changes, but let browser pinch magnify the scene.
   // Dialogs still follow the visible rectangle so their inputs/actions stay reachable.
   const visible={width:vv?.width??innerWidth,height:vv?.height??innerHeight,left:vv?.offsetLeft??0,top:vv?.offsetTop??0};
   const zoomed=vv?.scale>1.01;this.root.dataset.zoomed=String(!!zoomed);
   const scene=zoomed?{width:document.documentElement.clientWidth,height:innerHeight,left:0,top:0}:{width:visible.width,height:visible.height,left:0,top:0};
   this.viewport=computeViewport({...scene,dpr:devicePixelRatio||1});const v=this.viewport;Object.assign(this.root.style,{left:v.left+'px',top:v.top+'px',width:v.width+'px',height:v.height+'px'});for(const[k,n]of Object.entries(visible))document.documentElement.style.setProperty('--view-'+k,n+'px');this.canvas.width=Math.round(v.width*v.dpr);this.canvas.height=Math.round(v.height*v.dpr);document.documentElement.style.setProperty('--scene-width',360*v.scale+'px');document.documentElement.style.setProperty('--pixel',Math.round(3*v.scale*v.dpr)/v.dpr+'px');document.documentElement.style.setProperty('--icon-cell',Math.round(3*v.scale*v.dpr)/v.dpr+'px');this.root.dataset.viewport=JSON.stringify(v);this.alignDialog();this.queue();};
  new MutationObserver(()=>this.queue()).observe($('automatic-news'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('scroll',this.resize);this.resize();
  installSceneInput(this.root,$('action-dialog'),()=>{this.pressed=null;this.queue();});
  this.root.addEventListener('pointerdown',e=>{const p=toLogical(this.viewport,e.clientX,e.clientY),hit=hitTest(this.activeControls??[],p.x,p.y);this.root.dataset.lastPointer=JSON.stringify({...p,key:hit?.key??null});this.pressed=hit?.key;this.queue();});
  for(const event of['pointerup','pointercancel','focusin','focusout'])this.root.addEventListener(event,()=>{if(event.startsWith('pointer'))this.pressed=null;this.queue();});
 }
 resetMotion(){this.motion.reset();clearTimeout(this.motionTimer);this.queue();}
 update(view){this.motion.observe(view.motionIds);if(!!view.pauseHint!==!!this.view?.pauseHint)this.idleSince=performance.now();this.view=view;this.layout=layoutScene(view);this.root.dataset.room=view.room;this.root.setAttribute('aria-label',({distill:'蒸留室',warehouse:'貯蔵庫',sales:'販売室'})[view.room]);this.root.dataset.sceneAnchors=JSON.stringify({floor:this.layout.floorY,shelf:this.layout.shelf,casks:this.layout.caskSlots,products:this.layout.productSlots,equipment:this.layout.equipment});$('scene-summary').textContent=[view.calendar,view.cash,view.generation,view.timeStatus,view.phaseSummary].filter(Boolean).join(' · ');$('scene-notice').textContent=view.notice??'';const progress=$('month-progress');progress.setAttribute('aria-valuenow',String(Math.round(100*(view.monthProgress??0))));progress.setAttribute('aria-valuetext','今月 '+Math.round(100*(view.monthProgress??0))+'％ · '+view.timeStatus);$('spirit-readout').setAttribute('aria-hidden',String(view.room!=='distill'));this.queue();}
 stopDrawing(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;for(const key of ['hintTimer','selectionTimer','motionTimer']){clearTimeout(this[key]);this[key]=null;}}
 queue(){if(document.hidden||this.suspended){this.stopDrawing();return;}if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
 controls(){
  for(const node of this.controlRoot.querySelectorAll('button'))node.dataset.sceneVisible='false';
  const active=[];
  for(const rect of this.layout.controls){const node=document.querySelector(rect.selector);if(!node||node.closest('[hidden]'))continue;node.classList.add('scene-hit');node.dataset.sceneKey=rect.key;node.dataset.sceneVisible='true';const r=projectRect(this.viewport,rect);Object.assign(node.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});const name=node.textContent.replace(/\s+/g,' ').trim();if(!node.hasAttribute('data-cask-id')&&!node.hasAttribute('data-product-id'))node.setAttribute('aria-label',rect.key==='open-staff-panel'&&this.view.staffBrief?name+' · '+this.view.staffBrief:rect.key==='trade-info'?'取引':name);active.push({...rect,node,label:name});}
  this.activeControls=active;this.root.dataset.hitRegions=JSON.stringify(active.map(({node,label,...r})=>r));this.root.dataset.reservationIcons=JSON.stringify((this.view.casks??[]).map(x=>({id:x.id,kind:x.reservationIcon,color:({clock:'#c5b687',stock:'#a8bbb0',pause:'#b69e9c'})[x.reservationIcon]??null})));this.root.dataset.staffStatus=this.view.staffBrief??'';
 }
 drawWorld(){
  const c=this.worldCtx,v=this.view,l=this.layout;c.clearRect(0,0,120,214);c.fillStyle='#41414b';c.fillRect(0,0,120,214);
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x/3),Math.round(y/3),Math.round(w/3),Math.round(h/3));};
  for(let y=0;y<l.floorY;y+=15){r(0,y,360,3,'#35353e');for(let x=(y/15%2)*24;x<360;x+=48)r(x,y,3,15,'#35353e');}
  // Codea edge checker: one native cell, mirrored into equally narrow wall bands.
  c.fillStyle='#2d2d36';for(let y=0;y<l.floorY/3;y++)for(let x=0;x<9;x++)if((x+y)%2===0){c.fillRect(x,y,1,1);c.fillRect(119-x,y,1,1);}
  r(0,l.floorY,360,640-l.floorY,'#644632');for(let x=0;x<360;x+=36){r(x,l.floorY,3,640-l.floorY,'#3c281e');r(x+3,l.floorY,3,640-l.floorY,'#a0785a');}for(let y=l.floorY+90;y<640;y+=90)r(0,y,360,3,'#a0785a');r(0,l.floorY,360,6,shadow);
  const rail=(x,y,w)=>{r(x+3,y+3,w,9,shadow);r(x,y,w,9,shadow);r(x+3,y+3,w-6,3,'#a0785a');};
  const post=(x,y,w,h)=>{r(x,y,w,h,shadow);r(x+3,y+3,w-6,h-6,'#a0785a');};
  if(v.room==='warehouse'||v.room==='sales'){
   // WarehouseShelves:draw uses palette10/11/12/16 from upper plane to underside.
   // Keep the existing four-native-row footprint and the separate bench rail intact.
   const shelfRail=(x,y,w)=>{r(x+3,y+3,w,9,shadow);r(x,y,w,3,'#3c281e');r(x,y+3,w,3,'#644632');r(x,y+6,w,3,'#a0785a');r(x,y+9,w,3,shadow);};
   const s=l.shelf;post(s.x,s.y,9,s.h);post(s.x+s.w-6,s.y,9,s.h);for(const y of s.rails)shelfRail(s.x,y,s.w);
   const items=v.room==='warehouse'?v.casks:v.products,slots=v.room==='warehouse'?l.caskSlots:l.productSlots;
   items.forEach((item,i)=>{const pos=slots[i];if(!pos)return;const image=sprite(v.room==='warehouse'?barrel(item.type):(item.brand?brandArt(item.wood,item.brand,item.priceTier):bottleArt(item.wood,item.priceTier)));const x=Math.round((pos.x+pos.w/2)/3-image.width/2),y=pos.base/3-image.contentBottom;if(item.selected){c.save();c.globalAlpha=this.reducedMotion.matches||Math.floor(performance.now()/900)%2===0?1:.35;c.fillStyle=ink;for(let row=0;row<4;row++)c.fillRect(Math.round((pos.x+pos.w/2)/3)-3+row,y-7+row,7-row*2,1);c.restore();}const arrival=this.arrival,identity=v.room==='warehouse'?item.id:item.releaseId,belongs=arrival.room===v.room&&arrival.ids.includes(identity);if(!(belongs&&arrival.blinkId===identity&&arrival.hidden))c.drawImage(image,x,y);if(belongs&&arrival.staticIds.includes(identity)){c.fillStyle=ink;c.fillRect(x-1,y,1,2);c.fillRect(x,y-1,2,1);c.fillRect(x+image.width-2,y-1,2,1);c.fillRect(x+image.width,y,1,2);}if(v.room==='warehouse'&&v.inspectId===item.id){const sample=sprite(glass(item.wood));c.drawImage(sample,Math.round((pos.x+pos.w/2+27)/3),pos.base/3-sample.height);}});
  }else{
   const e=l.equipment;post(72,e.benchY+6,9,l.floorY-e.benchY-6);post(282,e.benchY+6,9,l.floorY-e.benchY-6);rail(72,e.benchY,216);const image=sprite(stillArt(),v.collection,v.phase==='distilling',this.stillFrame);c.drawImage(image,e.x/3,e.y/3);
  }

 }
 // Text is rasterized at integral physical dots, independently of the room scale.
 textMetrics(size=BODY_SIZE){return pixelTypography(size,this.viewport.scale*this.viewport.dpr,document.documentElement.dataset.fontState==='ready');}
 runs(text,size=BODY_SIZE){const c=this.ctx,m=this.textMetrics(size);return textRuns(text).map(run=>{const pixels=run.number?m.numberPixels:m.pixels;c.font=`400 ${pixels}px ${FONT_STACK}`;return{...run,pixels,width:c.measureText(run.text).width,drop:run.number?m.numberDrop:0};});}
 measure(text,size=BODY_SIZE){return this.runs(text,size).reduce((sum,run)=>sum+run.width,0)/this.textMetrics(size).unit;}
 text(text,x,y,size=BODY_SIZE,align='left',color=ink,suffix=null){const c=this.ctx,v=this.viewport,runs=this.runs(text,size),width=runs.reduce((sum,run)=>sum+run.width,0);let px=Math.round((v.offsetX+x*v.scale)*v.dpr)-(align==='center'?width/2:align==='right'?width:0);const py=Math.round((v.offsetY+y*v.scale)*v.dpr);c.save();c.setTransform(1,0,0,1,0,0);c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=color;for(const run of runs){c.font=`400 ${run.pixels}px ${FONT_STACK}`;if(suffix&&run.text.endsWith(suffix.text)){const prefix=run.text.slice(0,-suffix.text.length);c.fillText(prefix,Math.round(px),py+run.drop);c.fillStyle=suffix.color;c.fillText(suffix.text,Math.round(px+c.measureText(prefix).width),py+run.drop);c.fillStyle=color;}else c.fillText(run.text,Math.round(px),py+run.drop);px+=run.width;}c.restore();}
 lines(text,x,y,width,size=BODY_SIZE,max=2,align='left'){
  const result=[];let line='';for(const piece of textPieces(text)){const parts=this.measure(piece,size)>width?Array.from(piece):[piece];for(const ch of parts){if(ch==='\n'){result.push(line);line='';continue;}if(this.measure(line+ch,size)>width&&line){result.push(line);line='';}line+=ch;}}if(line)result.push(line);const shown=result.slice(0,max);if(result.length>max){let last=Array.from(shown.at(-1));while(last.length&&this.measure(last.join('')+'…',size)>width)last.pop();shown[shown.length-1]=last.join('')+'…';}const step=Math.max(size+4,this.textMetrics(size).logical+4);shown.forEach((s,i)=>this.text(s,x,y+i*step,size,align));return shown.length;
 }
 pixelRect(x,y,w,h,color){const c=this.ctx,v=this.viewport,left=Math.round((v.offsetX+x*v.scale)*v.dpr),top=Math.round((v.offsetY+y*v.scale)*v.dpr);c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=color;c.fillRect(left,top,Math.round((v.offsetX+(x+w)*v.scale)*v.dpr)-left,Math.round((v.offsetY+(y+h)*v.scale)*v.dpr)-top);c.restore();}
 window(x,y,w,h,fill='#2e3143',border='#6c707b'){this.pixelRect(x+3,y+3,w,h,shadow);this.pixelRect(x,y,w,h,border);this.pixelRect(x+3,y+3,w-6,h-6,fill);}
 icon(kind,x,y,w,h,color=ink){const c=this.ctx,v=this.viewport,unit=v.scale*v.dpr,cell=Math.max(1,Math.round(3*unit)),width=kind==='store'?11:7;c.save();c.setTransform(1,0,0,1,0,0);drawSymbol(c,kind,Math.round((v.offsetX+(x+w/2)*v.scale)*v.dpr-width*cell/2),Math.round((v.offsetY+(y+h/2)*v.scale)*v.dpr-width*cell/2),cell,color);c.restore();}
 draw(){
  this.stopDrawing();
  if(!this.view||!this.fontSettled||document.hidden||this.suspended)return;
  const now=performance.now(),visible=!document.hidden&&!$('action-dialog').open;
  this.stillMoving=visible&&!this.reducedMotion.matches&&this.view.room==='distill'&&this.view.phase==='distilling'&&this.view.running;
  this.stillFrame=this.stillMoving?Math.floor(now/400)%2:0;
  this.arrival=this.motion.sample({room:this.view.room,caskIds:this.view.casks.map(c=>c.id),releaseIds:this.view.products.map(p=>p.releaseId),visible,reduced:this.reducedMotion.matches,now});
  this.root.dataset.roomMotion=JSON.stringify({stillFrame:this.stillFrame,stillMoving:this.stillMoving,arrival:this.arrival});
  this.controls();this.drawWorld();
  // Presentation clock only: never advances, saves or changes the game state.
  const resume=this.activeControls.find(a=>a.key==='toggle-time'),hintEligible=this.view.pauseHint&&visible&&!this.reducedMotion.matches&&resume&&!resume.node.disabled;
  const idle=performance.now()-this.idleSince,hintBright=hintEligible&&idle>=12000&&Math.floor((idle-12000)/1200)%2===0;
  this.root.dataset.playbackHint=hintEligible?(idle<12000?'waiting':hintBright?'bright':'quiet'):'off';const c=this.ctx,v=this.viewport,view=this.view,l=this.layout;c.setTransform(v.dpr,0,0,v.dpr,0,0);c.fillStyle=shadow;c.fillRect(0,0,v.width,v.height);c.imageSmoothingEnabled=false;c.drawImage(this.world,0,0,120,640/3,v.offsetX,v.offsetY,360*v.scale,640*v.scale);c.save();c.translate(v.offsetX,v.offsetY);c.scale(v.scale,v.scale);
  // Keep the original book cells; center their painted bounds in the button.
  const book=(x,y,w,h,color)=>this.pixelRect(x,y,w,h,color);

  this.window(6,6,348,39,'#292b39','#d8d5df');
  let headerSize=BODY_SIZE;
  while(headerSize>8&&this.measure(view.calendar+' '+view.generation,headerSize)+this.measure(view.cash,headerSize)>312)headerSize--;
  const calendarRight=15+this.measure(view.calendar,headerSize),generationX=calendarRight+this.measure(' ',headerSize),generationRight=generationX+this.measure(view.generation,headerSize),cashWidth=this.measure(view.cash,headerSize);
  this.text(view.calendar,15,32,headerSize);this.text(view.generation,generationX,32,headerSize);this.text(view.cash,345,32,headerSize,'right','#e6c77a');this.root.dataset.headerLayout=JSON.stringify({cashWidth,cashY:32,calendarRight,generationRight,cashLeft:345-cashWidth,size:headerSize,blocks:[{x:6,y:6,w:348,h:39}]});
  // Target two CSS pixels, aligned to physical dots and flush with the calendar frame.
  const timeBar={x:6,y:45,w:348,h:2/v.scale,cssHeight:2},progress=Math.max(0,Math.min(1,view.monthProgress??0));
  this.pixelRect(timeBar.x,timeBar.y,timeBar.w,timeBar.h,'#353947');this.pixelRect(timeBar.x,timeBar.y,timeBar.w*progress,timeBar.h,'#c5b687');this.root.dataset.timeBar=JSON.stringify({...timeBar,progress});this.root.dataset.monthProgress=String(view.monthProgress??0);
  const items=view.room==='warehouse'?view.casks:view.room==='sales'?view.products:[],slots=view.room==='warehouse'?l.caskSlots:l.productSlots;
  const salesText=[],reservationLayout=[],cooledLayout=[];
  items.forEach((item,i)=>{const p=slots[i];if(!p)return;const mid=p.x+p.w/2,sales=view.room==='sales';
   if(sales){const stock=item.stock??Number(item.state.split('本')[0]),status=item.saleState??item.state.split(' · ')[1]??'',countX=mid-24,countY=p.base-39,dateY=p.base+30,date=item.releaseDate??item.name.split('\n').at(-1).split(' · ')[0],dateText=this.measure(date)>132?date.replace('年','年\n'):date,dateLines=this.lines(dateText,mid,dateY,132,BODY_SIZE,2,'center'),statusY=dateY+dateLines*Math.max(BODY_SIZE+4,this.textMetrics().logical+4);
    this.text(stock+'本',countX,countY,16,'right');this.text(status,mid,statusY,BODY_SIZE,'center',status==='販売中'?'#efae95':['保管','保管中'].includes(status)?'#c0bfbb':ink);
    salesText.push({id:item.id,stock,status,count:{x:countX,y:countY,align:'right',size:16},date:{text:date,lines:dateLines,x:mid,y:dateY,size:BODY_SIZE},statusLabel:{x:mid,y:statusY,align:'center',size:BODY_SIZE},bottle:{x:mid-18,y:p.base-33,w:36,h:33}});
   }else{const titleY=p.base+27,lines=this.lines(uiText(item.name),mid,titleY,132,BODY_SIZE,item.flavorName?2:1,'center'),detailY=titleY+lines*Math.max(26,this.textMetrics().logical+4);this.text(item.age,mid,detailY,BODY_SIZE,'center');
    if(item.cooled){const x=mid-45,y=p.base-33;/* Separate left-hand snow crystal, no change to the cask sprite. */for(const [dx,dy,w,h] of [[9,0,3,21],[0,9,21,3],[3,3,3,3],[15,3,3,3],[3,15,3,3],[15,15,3,3]])this.pixelRect(x+dx,y+dy,w,h,'#a8c5cf');cooledLayout.push({id:item.id,x,y,w:21,h:21});}
    if(item.reservationIcon){const x=mid+30,y=p.base-33,color=({clock:'#c5b687',stock:'#a8bbb0',pause:'#b69e9c'})[item.reservationIcon]??ink;drawSymbol(c,item.reservationIcon,x,y,3,color);reservationLayout.push({id:item.id,kind:item.reservationIcon,x,y,w:21,h:21,color,cask:{x:mid-24,y:p.base-45,w:48,h:45}});}
   }
  });this.root.dataset.cooledLayout=JSON.stringify(cooledLayout);this.root.dataset.salesText=JSON.stringify(salesText);this.root.dataset.reservationLayout=JSON.stringify(reservationLayout);
  if(view.room==='sales'&&view.pageCount>1)this.text(view.pageLabel,180,139,BODY_SIZE,'center');
  const phaseLines=view.room==='distill'&&view.phaseSummary?this.lines(view.phaseSummary,15,132,330,BODY_SIZE,2):0;
  const spiritOffset=phaseLines>1?18:0,readout=view.room==='distill'?view.spirit:null;this.root.dataset.phaseLayout=JSON.stringify({lines:phaseLines,spiritTop:readout?(readout.compact?216:141)+spiritOffset:null,spiritBottom:readout?(readout.compact?252:readout.phrase&&readout.axes.length?255:243)+spiritOffset:null,equipmentTop:l.equipment.y});
  if(view.room==='distill'&&view.spirit){const p=view.spirit;if(p.compact){this.window(72,216+spiritOffset,216,36,'#2e3143','#858995');this.text(uiText(p.kind)+' '+p.volume,180,240+spiritOffset,16,'center');}else{this.window(24,141+spiritOffset,312,p.phrase&&p.axes.length?114:102,'#2e3143','#858995');this.text(uiText(p.kind)+' '+p.volume,36,164+spiritOffset,BODY_SIZE);p.axes.forEach((a,i)=>{const y=192+spiritOffset+i*28;this.text(uiText(a.label),36,y,BODY_SIZE);c.fillStyle='#414644';c.fillRect(144,y-10,180,9);c.fillStyle='#c8b77e';c.fillRect(144,y-10,180*a.ratio,9);});if(p.phrase)this.lines(p.phrase,36,(p.axes.length?244:195)+spiritOffset,288,16,1);}}
  if(view.room==='distill'&&Number.isInteger(view.countdown)&&view.countdown>=1&&view.countdown<=3){
   // One repaint per digit, using the scene's existing pixel font.
   this.text(String(view.countdown),180,228,48,'center');this.root.dataset.countdown=String(view.countdown);
  }else delete this.root.dataset.countdown;
  if(view.room==='distill'){
   const g=collectionGeometry(view.cutRange),point=n=>g.x+Math.round(n*g.w);
   this.pixelRect(g.x,g.y,g.w,g.h,'#656978');
   if(g.start!==null)this.pixelRect(point(g.start),g.y,Math.max(0,point(g.rangeEnd)-point(g.start)),g.h,'#b8aa7c');
   this.pixelRect(point(g.current)-1,g.y-3,2,g.h+6,'#f0e6c8');
   for(const n of [g.start,g.end])if(n!==null)for(let row=0;row<4;row++)this.pixelRect(point(n)-3+row,g.y-10+row,7-row*2,1,'#f0e6c8');
   this.root.dataset.collectionBar=JSON.stringify(g);
  }else delete this.root.dataset.collectionBar;
  const noticeStep=Math.max(26,this.textMetrics().logical+4),metrics=this.textMetrics();
  // The same normal scene font and wrapping apply to both transient notice paths.
  if(view.notice){const n=noticeLayout(view.notice,t=>this.measure(t),{step:noticeStep});this.window(n.x,n.y,n.w,n.h,'#2e3143','#858995');
   c.save();c.font=`400 ${metrics.pixels}px ${FONT_STACK}`;const bounds=c.measureText('国Ag');c.restore();const baseline=(bounds.actualBoundingBoxAscent-bounds.actualBoundingBoxDescent)/metrics.unit/2;
   n.lines.forEach((line,i)=>this.text(line,n.x+n.w/2,n.y+n.padding+n.step*(i+.5)+baseline,BODY_SIZE,'center'));this.root.dataset.noticeLayout=JSON.stringify(n);
  }else delete this.root.dataset.noticeLayout;
  const news=$('automatic-news');if(news&&!news.hidden){
   const n=noticeLayout(news.textContent,t=>this.measure(t),{step:noticeStep}),r=projectRect(v,n),border=parseFloat(getComputedStyle(news).borderLeftWidth);
   Object.assign(news.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',fontSize:metrics.pixels/v.dpr+'px',lineHeight:noticeStep*v.scale+'px',padding:Math.max(0,n.padding*v.scale-border)+'px'});news.dataset.noticeLayout=JSON.stringify(n);
  }

  this.window(9,582,342,45,'#292b39','#d8d5df');for(const x of[123,237])this.pixelRect(x,588,3,33,'#858995');
  for(const a of this.activeControls){
   if(a.key.startsWith('cask-')||a.key.startsWith('product-'))continue;
   const pressed=this.pressed===a.key,selected=a.node.getAttribute('aria-pressed')==='true';
   if(['open-ledger','open-staff-panel','shop-offer','open-aux-menu'].includes(a.key)){
    const kind=$('action-dialog').open?$('action-dialog').dataset.kind:'',active=a.key==='open-ledger'?kind==='ledger':a.key==='open-staff-panel'?/^(staff|bottl)/.test(kind):a.key==='shop-offer'?/^(stockist|shop-offer)/.test(kind):kind==='aux-panel',x=a.x+(a.w-54)/2;
    this.window(x,a.y,54,54,pressed?'#19141e':active?'#414552':'#292b39',pressed?'#f0e6c8':'#d8d5df');if(active)this.pixelRect(x+6,a.y+45,42,3,'#d8d5df');
    if(a.key==='open-ledger'){const bx=x+12,by=a.y+10.5;book(bx,by,30,33,'#6e5a42');book(bx+3,by,27,30,'#b69a65');book(bx+3,by,3,30,'#e4c58a');book(bx+6,by+3,21,24,'#e7dcc0');book(bx+9,by+6,15,3,'#9a835c');book(bx+9,by+12,15,3,'#9a835c');book(bx+9,by+18,12,3,'#9a835c');}
    else if(a.key==='open-aux-menu'){for(let i=0;i<3;i++)this.pixelRect(x+15+i*9,a.y+25.5,3,3,ink);}
    else this.icon(a.key==='open-staff-panel'?'person':'store',x,a.y,54,54);
    if(a.key==='open-aux-menu'&&view.staffBrief&&view.room==='distill')this.text(view.staffBrief,a.x+a.w+9,a.y+32,BODY_SIZE);
    continue;
   }
   if(a.key==='trade-info'){drawSymbol(c,'handshake',a.x+11,a.y+6,3,ink);continue;}
   if(a.key.startsWith('room-')){this.text(({distill:'蒸留室',warehouse:'貯蔵庫',sales:'販売室'})[a.key.slice(5)],a.x+a.w/2,a.y+29,BODY_SIZE,'center',selected?ink:'#c1bdb0');if(selected){c.fillStyle='#d3bd84';c.fillRect(a.x+24,a.y+39,a.w-48,3);}continue;}
   const primary=['start-distill','stop-distill','open-fill','go-distill'].includes(a.key),quiet=['open-staff-panel','shop-offer','shelf-prev','shelf-next'].includes(a.key);
   if(!quiet)this.window(a.x,a.y+(a.key==='toggle-time'?6:0),a.w,a.h-(a.key==='toggle-time'?12:0),pressed?'#19141e':primary?'#685038':'#292b39',primary?'#ae8d60':a.key==='toggle-time'?(hintBright?'#f0e6c8':'#d8d5df'):'#858995');
   else if(pressed){c.fillStyle='#414350';c.fillRect(a.x,a.y,a.w,a.h);}
   if(a.key==='toggle-time'){const kind=view.running?(view.playbackRate===2?'fast':'play'):'pause';this.root.dataset.timeIcon=kind;this.root.dataset.playbackRate=String(view.playbackRate);const unit=v.scale*v.dpr,cell=Math.max(1,Math.round(3*unit));c.save();c.setTransform(1,0,0,1,0,0);drawSymbol(c,kind,Math.round((v.offsetX+(a.x+a.w/2)*v.scale)*v.dpr-3.5*cell),Math.round((v.offsetY+(a.y+a.h/2)*v.scale)*v.dpr-3.5*cell),cell,ink);c.restore();if(a.node.disabled){c.fillStyle='#292b3966';c.fillRect(a.x+3,a.y+3,a.w-6,a.h-6);}continue;}
   const label=a.key==='trade-info'?'取引':a.key==='shop-offer'?'取扱店':a.key==='toggle-time'?a.label.replace('蒸留を再開する','蒸留を再開'):a.label;
   if(['start-distill','stop-distill'].includes(a.key)){this.runs(label);const bounds=c.measureText(label),baseline=a.y+a.h/2+(bounds.actualBoundingBoxAscent-bounds.actualBoundingBoxDescent)/(2*this.textMetrics().unit);this.text(label,a.x+a.w/2,baseline,BODY_SIZE,'center');}
   else this.lines(label,a.x+a.w/2,a.y+27,a.w-12,BODY_SIZE,2,'center');
   if(a.node.disabled){c.fillStyle='#292b3966';c.fillRect(a.x+3,a.y+3,a.w-6,a.h-6);}
  }
  c.restore();
  clearTimeout(this.hintTimer);if(hintEligible)this.hintTimer=setTimeout(()=>this.queue(),idle<12000?12000-idle:1200-(idle-12000)%1200);
  clearTimeout(this.selectionTimer);if(visible&&!this.reducedMotion.matches&&items.some(item=>item.selected))this.selectionTimer=setTimeout(()=>this.queue(),900-performance.now()%900);
  clearTimeout(this.motionTimer);const delays=[this.stillMoving?400-performance.now()%400:null,this.arrival.nextMs].filter(n=>Number.isFinite(n)&&n>0);if(delays.length&&visible)this.motionTimer=setTimeout(()=>this.queue(),Math.min(...delays));
 }
}
