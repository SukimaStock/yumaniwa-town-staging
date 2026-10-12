import {pickMesh} from './engine/geometry.js?v=0.4.0';
import {Camera} from './engine/camera.js?v=0.4.0';
import {TouchSession} from './engine/session.js?v=0.4.0';
import {createDebugPanel} from './debug.js?v=0.4.0';
import {TouchInput} from './engine/interaction.js?v=0.4.0';
import {Renderer} from './engine/renderer.js?v=0.4.0';
import {AnimationLoop} from './engine/loop.js?v=0.4.0';
import {loadCollection} from './collection.js?v=0.4.0';
import {previewSvg} from './preview.js?v=0.4.0';
const canvas=document.querySelector('#solid'),notice=document.querySelector('#notice'),hint=document.querySelector('#hint');
const collectionView=document.querySelector('#collection-view'),touchView=document.querySelector('#touch-view'),grid=document.querySelector('#collection-grid'),status=document.querySelector('#collection-status');
const session=new TouchSession(),camera=new Camera(),debugHost=document.querySelector('#debug-host');
const debugMode=new URLSearchParams(location.search).has('debug'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer=null,input=null,debug=null,contextLost=false,active=false,keyPress=false,items=[],selected=-1,collectionScroll=0;
function message(text){notice.textContent=text;notice.hidden=false;hint.hidden=true;}
function preference(){if(session.body){session.body.options.settle=reduced.matches?0:.014;session.body.options.damping=reduced.matches?4:1.85;}}
reduced.addEventListener('change',preference);
const loop=new AnimationLoop(dt=>{input?.step(dt);session.body?.step(dt);},()=>{
 if(renderer&&session.body){renderer.draw(session.mesh,session.body.pose(),camera);debug?.update();}
});
const pick=(x,y)=>{if(!session.body)return null;const ray=camera.ray(x,y,canvas.getBoundingClientRect(),session.body.pose());return pickMesh(session.mesh,ray.origin,ray.direction);};
function resize(){
 input?.cancel();session.body?.cancel();
 const r=canvas.getBoundingClientRect();if(!active||!r.width||!r.height)return;
 renderer?.resize(r.width,r.height,devicePixelRatio);camera.resize(r.width,r.height,session.mesh.radius);
}
function pause(){input?.cancel();session.body?.cancel();keyPress=false;loop.stop();}
function resume(){if(active&&renderer&&!document.hidden&&!contextLost)loop.start();}
function discard(){pause();input?.destroy();input=null;debug=null;debugHost.replaceChildren();session.clear();if(debugMode)delete window.touchLab;}
function show(index){
 const item=items[index];if(!item?.definition)return;
 if(!active)collectionScroll=collectionView.scrollTop;
 discard();selected=index;active=true;collectionView.hidden=true;touchView.hidden=false;
 document.querySelector('#specimen-name').textContent=`${String(item.index).padStart(2,'0')} / ${item.definition.name}`;
 document.querySelector('#specimen-number').textContent=`${index+1} / ${items.length}`;
 notice.hidden=true;hint.hidden=false;hint.classList.remove('touched');canvas.hidden=false;
 session.select(item.definition);preference();
 input=new TouchInput(canvas,session.body,pick,()=>hint.classList.add('touched'),(x,y,q,p)=>camera.pullMapping(x,y,canvas.getBoundingClientRect(),q,p));
 try{if(!renderer)renderer=new Renderer(canvas);}catch(error){
  canvas.hidden=true;message(error.message==='WEBGL2_UNAVAILABLE'?'このブラウザではWebGL 2を利用できません。別のブラウザで開いてみてください。':'描画を開始できませんでした。ページを開き直してください。');
  console.warn('Touch Lab could not start:',error.message);
 }
 if(contextLost){canvas.hidden=true;message('描画を一時停止しました。');}
 if(debugMode){
  debug=createDebugPanel(session.body,input,debugHost,()=>renderer?renderer.gl.getError():'非対応');
  window.touchLab={body:session.body,mesh:session.mesh,camera,pick,renderer,input,loop};
 }
 resize();resume();if(!canvas.hidden)canvas.focus({preventScroll:true});else document.querySelector('#back').focus({preventScroll:true});
}
function back(){
 discard();active=false;touchView.hidden=true;collectionView.hidden=false;collectionView.scrollTop=collectionScroll;
 grid.querySelector(`[data-index="${selected}"]`)?.focus({preventScroll:true});
}
document.querySelector('#back').addEventListener('click',back);
document.querySelector('#previous').addEventListener('click',()=>show((selected+items.length-1)%items.length));
document.querySelector('#next').addEventListener('click',()=>show((selected+1)%items.length));
new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.addEventListener('blur',pause);window.addEventListener('focus',resume);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;pause();if(active)message('描画を一時停止しました。');});
canvas.addEventListener('webglcontextrestored',()=>{
 try{renderer.initialize();contextLost=false;if(active){canvas.hidden=false;notice.hidden=true;hint.hidden=false;resize();resume();}}
 catch{if(active)message('描画を再開できませんでした。ページを開き直してください。');}
});
canvas.addEventListener('keydown',e=>{
 if(input?.pointer||!session.body)return;
 const body=session.body;
 if(e.key.startsWith('Arrow')){e.preventDefault();body.release();const dx=e.key==='ArrowRight'?18:e.key==='ArrowLeft'?-18:0,dy=e.key==='ArrowDown'?18:e.key==='ArrowUp'?-18:0;body.drag(dx,dy,.1,400);hint.classList.add('touched');}
 if(e.code==='Space'&&!e.repeat){e.preventDefault();const r=canvas.getBoundingClientRect(),hit=pick(r.left+r.width/2,r.top+r.height/2);if(hit){body.press(hit);keyPress=true;}}
});
canvas.addEventListener('keyup',e=>{if(e.code==='Space'&&keyPress){e.preventDefault();session.body?.release();keyPress=false;}});
canvas.addEventListener('blur',()=>{keyPress=false;session.body?.cancel();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();back();}});
try{
 const loaded=await loadCollection();items=loaded.filter(item=>item.definition);
 for(const item of loaded){
  const card=document.createElement('button');card.type='button';card.className='specimen-card';card.dataset.index=items.indexOf(item);
  const number=document.createElement('span');number.className='card-number';number.textContent=String(item.index).padStart(2,'0');
  const thumbnail=document.createElement('span');thumbnail.className='thumbnail';
  const name=document.createElement('span');name.className='card-name';name.textContent=item.definition?.name??item.id;
  const tags=document.createElement('span');tags.className='card-tags';tags.textContent=item.definition?.tags.join(' / ')??'準備中';
  if(item.definition){thumbnail.innerHTML=previewSvg(item.definition);card.addEventListener('click',()=>show(items.indexOf(item)));}
  else{card.disabled=true;thumbnail.textContent='読み込めませんでした';}
  card.append(number,thumbnail,name,tags);grid.append(card);
 }
 status.hidden=loaded.every(item=>item.definition);if(!status.hidden)status.textContent='一部の立体を読み込めませんでした。ほかの立体は触れます。';
}catch(error){status.textContent='立体を読み込めませんでした。ページを開き直してください。';console.warn('Touch Lab collection:',error.message);}
