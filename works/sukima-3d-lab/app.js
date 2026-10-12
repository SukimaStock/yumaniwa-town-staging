import {createPolyhedron,pickMesh} from './engine/geometry.js?v=0.3.0';
import {Camera} from './engine/camera.js?v=0.3.0';
import {TouchBody} from './engine/dynamics.js?v=0.3.0';
import {createDebugPanel} from './debug.js?v=0.3.0';
import {TouchInput} from './engine/interaction.js?v=0.3.0';
import {Renderer} from './engine/renderer.js?v=0.3.0';
import {AnimationLoop} from './engine/loop.js?v=0.3.0';
const canvas=document.querySelector('#solid'),notice=document.querySelector('#notice'),hint=document.querySelector('#hint');
function message(text){notice.textContent=text;notice.hidden=false;hint.hidden=true;}
try {
 const renderer=new Renderer(canvas),mesh=createPolyhedron(),camera=new Camera(),body=new TouchBody(mesh);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function preference(){body.options.settle=reduced.matches?0:.014;body.options.damping=reduced.matches?4:1.85;}preference();reduced.addEventListener('change',preference);
 const pick=(x,y)=>{const ray=camera.ray(x,y,canvas.getBoundingClientRect(),body.pose());return pickMesh(mesh,ray.origin,ray.direction);};
 const input=new TouchInput(canvas,body,pick,()=>hint.classList.add('touched'),(x,y,pose,point)=>camera.pullMapping(x,y,canvas.getBoundingClientRect(),pose,point));
 let debug=null;
 const loop=new AnimationLoop(dt=>{input.step(dt);body.step(dt);},()=>{renderer.draw(mesh,body.pose(),camera);debug?.update();});
 const resize=()=>{input.cancel();body.cancel();const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.resize(rect.width,rect.height,devicePixelRatio);camera.resize(rect.width,rect.height);};
 const observer=new ResizeObserver(resize);observer.observe(canvas);window.addEventListener('resize',resize);resize();
 let contextLost=false;
 const pause=()=>{input.cancel();body.cancel();loop.stop();};
 const resume=()=>{if(!document.hidden&&!contextLost)loop.start();};
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.addEventListener('blur',()=>{input.cancel();body.cancel();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;pause();message('描画を一時停止しました。');});
 canvas.addEventListener('webglcontextrestored',()=>{try{renderer.initialize();contextLost=false;notice.hidden=true;hint.hidden=false;resize();resume();}catch{message('描画を再開できませんでした。ページを開き直してください。');}});
 let keyPress=false;
 canvas.addEventListener('keydown',e=>{
  if(input.pointer)return;
  if(e.key.startsWith('Arrow')){e.preventDefault();body.release();const dx=e.key==='ArrowRight'?18:e.key==='ArrowLeft'?-18:0,dy=e.key==='ArrowDown'?18:e.key==='ArrowUp'?-18:0;body.drag(dx,dy,.1,400);hint.classList.add('touched');}
  if(e.code==='Space'&&!e.repeat){e.preventDefault();const r=canvas.getBoundingClientRect(),hit=pick(r.left+r.width/2,r.top+r.height/2);if(hit){body.press(hit);keyPress=true;}}
 });
 canvas.addEventListener('keyup',e=>{if(e.code==='Space'&&keyPress){e.preventDefault();body.release();keyPress=false;}});
 canvas.addEventListener('blur',()=>{keyPress=false;body.cancel();});
 if(new URLSearchParams(location.search).has('debug')) {
  debug=createDebugPanel(body,input,document.querySelector('main'),()=>renderer.gl.getError());
  // Debug access is opt-in and work-local; useful for mechanical browser checks.
  window.touchLab={body,mesh,camera,pick,renderer,input,loop};
 }
 resume();
} catch(error) {
 canvas.hidden=true;
 message(error.message==='WEBGL2_UNAVAILABLE'?'このブラウザではWebGL 2を利用できません。別のブラウザで開いてみてください。':'描画を開始できませんでした。ページを開き直してください。');
 console.warn('Touch Lab could not start:',error.message);
}
