import {pickMesh} from './engine/geometry.js?v=0.7.1';
import {Camera} from './engine/camera.js?v=0.7.1';
import {SpecimenSession} from './engine/session.js?v=0.7.1';
import {createDebugPanel} from './debug.js?v=0.7.1';
import {PointerInput} from './engine/interaction.js?v=0.7.1';
import {Renderer} from './engine/renderer.js?v=0.7.1';
import {AnimationLoop} from './engine/loop.js?v=0.7.1';
import {loadCollection} from './collection.js?v=0.7.1';
import {previewSvg,previewRaster} from './preview.js?v=0.7.1';
import {manipulationMapping} from './engine/manipulation-mapping.js?v=0.7.1';
import {createManipulationPanel} from './manipulation-debug.js?v=0.7.1';
const canvas=document.querySelector('#solid'),notice=document.querySelector('#notice'),hint=document.querySelector('#hint');
const collectionView=document.querySelector('#collection-view'),touchView=document.querySelector('#touch-view'),grid=document.querySelector('#collection-grid'),status=document.querySelector('#collection-status');
const session=new SpecimenSession(),camera=new Camera(),debugHost=document.querySelector('#debug-host');
const motionButton=document.querySelector('#toggle-motion');
const debugMode=new URLSearchParams(location.search).has('debug'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer=null,input=null,debug=null,contextLost=false,active=false,keyPress=false,items=[],selected=-1,collectionScroll=0,collectionFocusCard=null;
function message(text){notice.textContent=text;notice.hidden=false;hint.hidden=true;}
function motionUI(){motionButton.hidden=!session.motion;motionButton.textContent=session.motion?.playing?'一時停止':'再生';motionButton.setAttribute('aria-label',session.motion?.playing?'パーツの動きを一時停止':'パーツの動きを再生');}
function preference(){if(session.body){session.body.options.settle=reduced.matches?0:.014;session.body.options.damping=reduced.matches?4:1.85;}if(reduced.matches)session.motion?.setPlaying(false);motionUI();}
reduced.addEventListener('change',preference);
const loop=new AnimationLoop(dt=>{input?.step(dt);session.step(dt);},()=>{
 if(renderer&&session.body){renderer.draw(session.mesh,session.body.pose(),camera,session.assembly);debug?.update();}
});
const pick=(x,y)=>{if(!session.body)return null;const ray=camera.ray(x,y,canvas.getBoundingClientRect(),session.body.pose());return session.assembly?session.assembly.pick(ray.origin,ray.direction):pickMesh(session.mesh,ray.origin,ray.direction);};
function resize(){
 input?.cancel();session.body?.cancel();session.manipulation?.cancel();
 const r=canvas.getBoundingClientRect();if(!active||!r.width||!r.height)return;
 renderer?.resize(r.width,r.height,devicePixelRatio);camera.resize(r.width,r.height,session.assembly?.radius??session.mesh.radius);
}
function pause(){input?.cancel();session.body?.cancel();session.manipulation?.cancel();keyPress=false;loop.stop();}
function resume(){if(active&&renderer&&!document.hidden&&!contextLost)loop.start();}
function discard(){pause();input?.destroy();input=null;debug=null;debugHost.replaceChildren();session.clear();if(debugMode)delete window.touchLab;}
function show(index){
 const item=items[index];if(!item?.definition)return;
 if(!active){collectionScroll=collectionView.scrollTop;collectionFocusCard=grid.querySelector(`[data-index="${index}"]`);}
 discard();selected=index;active=true;collectionView.hidden=true;touchView.hidden=false;
 document.querySelector('#specimen-name').textContent=`${String(item.number??item.index).padStart(2,'0')} / ${item.definition.name}`;
 document.querySelector('#specimen-number').textContent=`${index+1} / ${items.length}`;
 notice.hidden=true;hint.hidden=false;hint.classList.remove('touched');canvas.hidden=false;
 session.select(item.definition);preference();
 const touch=session.body.touchEnabled;
 const controls=session.manipulation?.controls,partHint=controls?.length===1?{rotate:'つかんで、回す。',hinge:'つかんで、開ける。',linear:'引き出す。押し戻す。'}[controls[0].type]:'パーツをつかんで、動かす。';
 hint.textContent=controls?partHint:touch?'押す。回す。長押しで引く。':session.motion?'動く形を、回して眺める。':'回して、眺める。';
 document.querySelector('#view-kind').textContent=controls?'HANDS-ON / 0.7':session.motion?'MOVING PARTS / 0.7':'FREE FORMS / 0.7';
 canvas.setAttribute('aria-label',touch?'触れる立体。押す、回す、長押しで引く。矢印で回転、スペースで押せます。':'立体。ドラッグまたは矢印キーで回転。初期姿勢に戻せます。');
 if(controls)canvas.setAttribute('aria-label',`${partHint} 固定部分や背景のドラッグ、矢印キーで模型全体を回せます。`);
 document.querySelector('#reset-pose').hidden=touch;
 input=new PointerInput(canvas,session.body,pick,()=>hint.classList.add('touched'),(x,y,q,p)=>camera.pullMapping(x,y,canvas.getBoundingClientRect(),q,p),controls?{controller:session.manipulation,map:(hit,x,y,rect,view)=>manipulationMapping(session.manipulation,hit,x,y,rect,view,camera)}:null);
 try{if(!renderer)renderer=new Renderer(canvas);}catch(error){
  canvas.hidden=true;message(error.message==='WEBGL2_UNAVAILABLE'?'このブラウザではWebGL 2を利用できません。別のブラウザで開いてみてください。':'描画を開始できませんでした。ページを開き直してください。');
  console.warn('Touch Lab could not start:',error.message);
 }
 if(contextLost){canvas.hidden=true;message('描画を一時停止しました。');}
 motionButton.disabled=!renderer||contextLost;
 if(debugMode){
  if(session.body.touchEnabled)debug=createDebugPanel(session.body,input,debugHost,()=>renderer?renderer.gl.getError():'非対応');
  if(session.motion){
   const panel=document.createElement('div'),output=document.createElement('output');panel.className='debug';panel.append(output);debugHost.append(panel);
   debug={update(){output.textContent=`MOTION ${session.motion.playing?'PLAY':'PAUSE'} / ${session.motion.time.toFixed(2)}s\n${session.motion.tracks.map(t=>`${t.part}: ${t.type}`).join('\n')}`;}};debug.update();
  }
  if(controls)debug=createManipulationPanel(session.manipulation,input,debugHost,resize);
  window.touchLab={body:session.body,mesh:session.mesh,motion:session.motion,manipulation:session.manipulation,camera,pick,renderer,input,loop};
 }
 resize();resume();if(!canvas.hidden)canvas.focus({preventScroll:true});else document.querySelector('#back').focus({preventScroll:true});
}
function back(){
 discard();active=false;touchView.hidden=true;collectionView.hidden=false;collectionView.scrollTop=collectionScroll;
 (grid.querySelector(`[data-index="${selected}"]`)??collectionFocusCard)?.focus({preventScroll:true});
}
document.querySelector('#reset-pose').addEventListener('click',()=>{input?.cancel();session.resetPose();debug?.update();});
motionButton.addEventListener('click',()=>{session.motion?.setPlaying(!session.motion.playing);motionUI();debug?.update();});
document.querySelector('#back').addEventListener('click',back);
document.querySelector('#previous').addEventListener('click',()=>show((selected+items.length-1)%items.length));
document.querySelector('#next').addEventListener('click',()=>show((selected+1)%items.length));
new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.addEventListener('blur',pause);window.addEventListener('focus',resume);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;motionButton.disabled=true;pause();if(active)message('描画を一時停止しました。');});
canvas.addEventListener('webglcontextrestored',()=>{
 try{renderer.initialize();contextLost=false;motionButton.disabled=false;if(active){canvas.hidden=false;notice.hidden=true;hint.hidden=false;resize();resume();}}
 catch{if(active)message('描画を再開できませんでした。ページを開き直してください。');}
});
canvas.addEventListener('keydown',e=>{
 if(input?.pointer||!session.body)return;
 const body=session.body;
 if(e.key.startsWith('Arrow')){e.preventDefault();body.release();const dx=e.key==='ArrowRight'?18:e.key==='ArrowLeft'?-18:0,dy=e.key==='ArrowDown'?18:e.key==='ArrowUp'?-18:0;body.drag(dx,dy,.1,400);hint.classList.add('touched');}
 if(body.touchEnabled&&e.code==='Space'&&!e.repeat){e.preventDefault();const r=canvas.getBoundingClientRect(),hit=pick(r.left+r.width/2,r.top+r.height/2);if(hit){body.press(hit);keyPress=true;}}
});
canvas.addEventListener('keyup',e=>{if(e.code==='Space'&&keyPress){e.preventDefault();session.body?.release();keyPress=false;}});
canvas.addEventListener('blur',()=>{keyPress=false;session.body?.cancel();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();back();}});
try{
 const loaded=await loadCollection();items=loaded.filter(item=>item.definition);
 let previewBudgetStart=performance.now();
 for(const item of loaded){
  const card=document.createElement('button');card.type='button';card.className='specimen-card';card.dataset.index=items.indexOf(item);
  const number=document.createElement('span');number.className='card-number';number.textContent=String(item.number??item.index).padStart(2,'0');
  const thumbnail=document.createElement('span');thumbnail.className='thumbnail';
  const name=document.createElement('span');name.className='card-name';name.textContent=item.definition?.name??item.id;
  const tags=document.createElement('span');tags.className='card-tags';tags.textContent=item.definition?.tags.join(' / ')??'準備中';
  if(item.definition){
   if(item.definition.schema==='sukima3d-specimen/1')thumbnail.innerHTML=previewSvg(item.definition);
   else{
    const raster=previewRaster(item.definition),image=document.createElement('canvas');image.width=raster.width;image.height=raster.height;image.setAttribute('aria-hidden','true');
    image.getContext('2d').putImageData(new ImageData(raster.pixels,raster.width,raster.height),0,0);thumbnail.append(image);
   }
   card.addEventListener('click',()=>show(items.indexOf(item)));
  }
  else{card.disabled=true;thumbnail.textContent='読み込めませんでした';}
  card.append(number,thumbnail,name,tags);grid.append(card);
  // Let completed cards paint and accept input before building the rest.
  if(performance.now()-previewBudgetStart>=12){
   await new Promise(resolve=>setTimeout(resolve,0));
   previewBudgetStart=performance.now();
  }
 }
 status.hidden=loaded.every(item=>item.definition);if(!status.hidden)status.textContent='一部の立体を読み込めませんでした。ほかの立体は触れます。';
}catch(error){status.textContent='立体を読み込めませんでした。ページを開き直してください。';console.warn('Touch Lab collection:',error.message);}
