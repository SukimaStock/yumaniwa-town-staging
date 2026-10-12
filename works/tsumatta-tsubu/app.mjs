import {Grains,walls} from './physics.mjs';
export const simulation = new Grains();
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let pointer=null,scale=1,ox=0,oy=0,previous=0,accumulator=0;
export function layout(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
  scale=Math.min(r.width/400,r.height/535);ox=(r.width-400*scale)/2;oy=(r.height-535*scale)/2;
  ctx.setTransform(dpr,0,0,dpr,0,0);draw();
}
const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale+80};};
function cancel(){simulation.release();if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}
canvas.addEventListener('pointerdown',e=>{
  if(pointer!==null||e.button!==0)return;
  const p=point(e);if(simulation.pick(p.x,p.y)<0)return;
  pointer=e.pointerId;canvas.setPointerCapture(pointer);e.preventDefault();draw();
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const p=point(e);simulation.move(p.x,p.y);e.preventDefault();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointer)cancel();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
  if(!simulation.drag){const p=simulation.particles.filter(p=>p.y<340).sort((a,b)=>b.r-a.r)[0];if(!p)return;simulation.pick(p.x,p.y);}
  simulation.drag.x+=e.key==='ArrowLeft'?-5:5;
});
canvas.addEventListener('keyup',cancel);canvas.addEventListener('blur',cancel);
document.querySelector('#reset').addEventListener('click',()=>{cancel();simulation.reset();accumulator=0;draw();});
window.addEventListener('blur',cancel);
document.addEventListener('visibilitychange',()=>{cancel();previous=0;accumulator=0;});
new ResizeObserver(()=>{cancel();layout();}).observe(canvas);
function draw(){
  const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(0,-80);
  // Quiet glass-like funnel; narrow opening is real collision geometry.
  ctx.beginPath();ctx.moveTo(64,135);ctx.lineTo(174,330);ctx.lineTo(174,344);
  ctx.lineTo(226,344);ctx.lineTo(226,330);ctx.lineTo(336,135);ctx.closePath();
  ctx.fillStyle='rgba(210,200,177,.035)';ctx.fill();
  ctx.lineCap='round';ctx.lineWidth=2;ctx.strokeStyle='#7f7c72';
  ctx.beginPath();ctx.moveTo(64,135);ctx.lineTo(174,330);ctx.lineTo(174,344);ctx.moveTo(226,344);ctx.lineTo(226,330);ctx.lineTo(336,135);ctx.stroke();
  for(let i=0;i<simulation.particles.length;i++){
    const p=simulation.particles[i];if(p.y>615)continue;
    ctx.globalAlpha=Math.min(1,Math.max(0,(615-p.y)/90));
    const selected=simulation.drag?.i===i;
    if(selected){ctx.beginPath();ctx.arc(p.x,p.y,p.r+7,0,Math.PI*2);ctx.strokeStyle='#e7ce9f';ctx.lineWidth=1;ctx.stroke();}
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=i<2?'#d9b985':['#d3cbb7','#b7b8a6','#c6baa6','#dfd3b9'][i%4];ctx.fill();
    ctx.beginPath();ctx.arc(p.x-p.r*.25,p.y-p.r*.3,p.r*.24,0,Math.PI*2);ctx.fillStyle='rgba(255,249,224,.23)';ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(174,165,143,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(200,570,53,5,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function frame(now){
  if(!document.hidden){accumulator+=previous?Math.min((now-previous)/1000,.05):0;while(accumulator>=1/120){simulation.step();accumulator-=1/120;}draw();}
  previous=now;requestAnimationFrame(frame);
}
layout();requestAnimationFrame(frame);
