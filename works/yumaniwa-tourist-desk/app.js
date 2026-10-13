import {PinchZoom} from './peek-zoom.js?v=0.3.1';
import {loadDesk,DESK} from './scene.js?v=0.3.1';
import {DeskRenderer} from './renderer.js?v=0.3.1';
import {manipulationMapping} from '../sukima-3d-lab/engine/manipulation-mapping.js?v=0.7.1';
const canvas=document.querySelector('canvas'),hint=document.querySelector('.invitation'),error=document.querySelector('.error'),soundButton=document.querySelector('.sound'),resetButton=document.querySelector('.view-reset'),mapLink=document.querySelector('.desk-map-link');
let scene,renderer,gesture=null,frame=0,previous=0,lost=false,sound=false,lastSound=0;
const zoomInput=new PinchZoom({getZoom:()=>scene?.zoom??1,setZoom:value=>{scene?.setZoom(value);updateReset();},cancelObject:()=>cancelObject(false)});
const audio=window.SSE.audio;audio.configure(window.SSE.audio.withBaseline({storageKey:"yumaniwa-tourist-desk.sound"}));audio.enabled=false;
// Sound is opt-in. It starts only from a user gesture; no BGM or ambient loop.
function readyAudio(){try{audio.enabled=sound;audio.unlock();audio.resumeContext();audio.syncBusVolumes(0);}catch{sound=false;soundButton.textContent='音なし';soundButton.setAttribute('aria-pressed','false');}}
function tick(material){const now=performance.now()/1000;if(!sound||now-lastSound<.075)return;lastSound=now;audio.tone({type:material==='metal'?'sine':'triangle',frequency:{metal:760,paper:180,wood:240,machine:125}[material]??200,endFrequency:65,duration:.075,volume:.075});}
soundButton.addEventListener('click',async()=>{sound=!sound;await readyAudio();soundButton.textContent=sound?'音あり':'音なし';soundButton.setAttribute('aria-pressed',String(sound));if(sound)tick('wood');});
function resize(){cancel();if(!scene||lost)return;const r=canvas.getBoundingClientRect();scene.resize(r.width,r.height);renderer.resize(r.width,r.height,Math.min(devicePixelRatio||1,1.5));renderer.draw();updateReset();}
function releaseCapture(id){if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
function cancelObject(release=true){if(gesture){const g=gesture;gesture=null;g.item.player.release?.(false);if(g.item.entry.press&&g.control)g.item.returning={part:g.control.part,value:g.control.initial};if(release)releaseCapture(g.pointer);}canvas.style.cursor='default';}
function cancel(){const ids=zoomInput.cancel();cancelObject();for(const id of ids)releaseCapture(id);}
function updateReset(){resetButton.hidden=!scene||scene.zoom<=1.0001;}
resetButton.addEventListener('click',()=>{cancel();scene?.setZoom(1);updateReset();renderer?.draw();});
function down(e){if(!scene||lost||gesture||e.button>0)return;const rect=canvas.getBoundingClientRect(),hit=scene.pick(e.clientX,e.clientY,rect,e.pointerType==='mouse'?7:14);if(!hit)return;e.preventDefault();const item=hit.item;mapLink.hidden=true;item.returning=null;const control=item.player.control?.(hit.part)??item.player.controls?.[0];
 const mapping=control?manipulationMapping(item.player,{...hit,part:control.part},hit.sampleX??e.clientX,hit.sampleY??e.clientY,rect,[0,0,0,1],item.localCamera(scene.camera,scene.view)):null;
 if(control)item.player.grab(control.part);
 gesture={pointer:e.pointerId,item,control,mapping,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:e.timeStamp,moved:0,initial:control?.value,position:item.position.slice(),rect,offsetX:(hit.sampleX??e.clientX)-e.clientX,offsetY:(hit.sampleY??e.clientY)-e.clientY};
 if(item.entry.press&&control){control.value=item.id==='ticket-stamper'?control.min:control.max;tick(item.entry.material);}canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';hint.classList.add('faded');if(sound)readyAudio();}
function move(e){if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const g=gesture,dt=Math.max(.001,(e.timeStamp-g.time)/1000),dx=e.clientX-g.x,dy=e.clientY-g.y;g.moved+=Math.hypot(dx,dy);
 if(g.control&&!g.item.entry.press)g.item.player.moveBy(g.control.part,g.mapping.delta(e.clientX+g.offsetX,e.clientY+g.offsetY),dt);
 else if(!g.control&&g.moved>4){const units=2*scene.camera.distance*Math.tan(scene.camera.fov/2)/g.rect.height;g.item.position[0]=Math.max(-DESK.halfWidth+.45,Math.min(DESK.halfWidth-.45,g.position[0]+(e.clientX-g.startX)*units));g.item.position[2]=Math.max(-DESK.halfDepth+.4,Math.min(DESK.halfDepth-.4,g.position[2]+(e.clientY-g.startY)*units/Math.cos(scene.pitch)));g.item.position[0]=Math.max(g.item.home[0]-.28,Math.min(g.item.home[0]+.28,g.item.position[0]));g.item.position[2]=Math.max(g.item.home[2]-.28,Math.min(g.item.home[2]+.28,g.item.position[2]));}
 if(g.moved>4&&!g.item.entry.press)tick(g.item.entry.material);g.x=e.clientX;g.y=e.clientY;g.time=e.timeStamp;}
function up(e){if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const g=gesture;
 if(g.moved<5&&!g.item.entry.press){if(g.control){const c=g.control;c.value=c.type==='rotate'?c.value+.65:c.value>(c.min+c.max)/2?c.min:c.max;tick(g.item.entry.material);}else if(g.item.motion){g.item.motion.setPlaying(!g.item.motion.playing);tick('machine');}else {g.item.position[0]=Math.max(g.item.home[0]-.28,Math.min(g.item.home[0]+.28,g.item.position[0]+(g.item.position[0]>g.item.home[0]?.06:-.06)));tick(g.item.entry.material);}}
 if(g.item.id==='folding-reading-stand'&&g.moved<5)mapLink.hidden=false;
 g.item.player.release?.(e.timeStamp-g.time<100);if(g.item.entry.press&&g.control)g.item.returning={part:g.control.part,value:g.control.initial};gesture=null;releaseCapture(g.pointer);canvas.style.cursor='default';}
function pointerDown(e){if(!scene||lost||e.button>0)return;const consumed=zoomInput.down(e);if(e.pointerType==='touch'){e.preventDefault();canvas.setPointerCapture(e.pointerId);}if(consumed){e.preventDefault();hint.classList.add('faded');return;}down(e);}
function pointerMove(e){if(zoomInput.move(e)){e.preventDefault();return;}move(e);}
function pointerUp(e){const consumed=zoomInput.end(e);if(consumed)e.preventDefault();else up(e);releaseCapture(e.pointerId);}
function pointerAbort(e){zoomInput.end(e);if(gesture?.pointer===e.pointerId)cancelObject(false);releaseCapture(e.pointerId);}
function pointerLost(e){if(zoomInput.points.has(e.pointerId))zoomInput.end(e);if(gesture?.pointer===e.pointerId)cancelObject(false);}
canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerAbort);canvas.addEventListener('lostpointercapture',pointerLost);
// Suppress native menus only on the manipulation canvas; guide links keep native behavior.
for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,e=>e.preventDefault());
function loop(time){frame=0;if(document.hidden||lost||!scene)return;scene.step(previous?Math.min(.05,(time-previous)/1000):0);previous=time;renderer.draw();frame=requestAnimationFrame(loop);}
function start(){if(!frame&&!document.hidden&&!lost&&scene){previous=0;audio.resumeFromLifecycle();frame=requestAnimationFrame(loop);}}
mapLink.addEventListener('click',cancel);
function pause(){cancel();cancelAnimationFrame(frame);frame=0;previous=0;audio.pauseForLifecycle();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else{resize();start();}});window.addEventListener('pagehide',pause);window.addEventListener('pageshow',()=>{resize();start();});window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;pause();error.hidden=false;error.textContent='机を休ませています…';});canvas.addEventListener('webglcontextrestored',()=>{try{renderer.restore();lost=false;error.hidden=true;resize();start();}catch{error.textContent='ページを開き直してください';}});
// A small keyboard alternative, without putting a control panel over the desk.
let keyboardIndex=0;canvas.addEventListener('keydown',e=>{if(!scene||!['ArrowLeft','ArrowRight','Enter',' '].includes(e.key))return;e.preventDefault();if(e.key.startsWith('Arrow')){keyboardIndex=(keyboardIndex+(e.key==='ArrowRight'?1:-1)+scene.items.length)%scene.items.length;hint.textContent=scene.items[keyboardIndex].entry.label;hint.classList.remove('faded');}else{const item=scene.items[keyboardIndex],c=item.player.controls?.[0];mapLink.hidden=item.id!=='folding-reading-stand';if(c){c.value=c.type==='rotate'?c.value+.65:c.value>(c.min+c.max)/2?c.min:c.max;if(item.entry.press)item.returning={part:c.part,value:c.initial};}else if(item.motion)item.motion.setPlaying(!item.motion.playing);hint.textContent=item.entry.label;hint.classList.remove('faded');if(sound)readyAudio();tick(item.entry.material);}});
try{scene=await loadDesk();renderer=new DeskRenderer(canvas,scene);resize();start();}catch(e){hint.hidden=true;error.hidden=false;error.textContent=e.message==='WEBGL2_UNAVAILABLE'?'このブラウザでは机を表示できません。Safariなど、WebGL 2対応ブラウザで開いてください。':'机の道具を読み込めませんでした。ページを開き直してください。';console.error(e);}
