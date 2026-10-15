import { createCoin, flick, step, pose, clamp } from './model.mjs';
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
const coin = createCoin();
let w, h, radius, gesture = null, frame = 0, previous = 0;
const view = .68, up = Math.sqrt(1 - view * view);
function resize() {
  cancel(); w = innerWidth; h = innerHeight; radius = Math.min(70, w * .17, h * .17);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(pose(coin));
}
function draw(state) {
  ctx.clearRect(0, 0, w, h);
  const {tilt, yaw, spin} = state, r = radius;
  const sy = Math.sin(yaw), cy = Math.cos(yaw), st = Math.sin(tilt), ct = Math.cos(tilt);
  const height = r * st + 3;
  const center = {x:w*.5, y:h*.53};
  const project = (x,y,z) => [center.x+x,center.y+y*view-z*up];
  const point = (a, scale=1, depth=0) => {
    const x=Math.cos(a)*r*scale, y=Math.sin(a)*r*scale;
    return project(cy*x-sy*ct*y+sy*st*depth,sy*x+cy*ct*y-cy*st*depth,height+st*y+ct*depth);
  };
  ctx.save();ctx.translate(center.x,center.y+2);ctx.scale(1,.48);
  const shadow=ctx.createRadialGradient(0,0,r*.2,0,0,r*1.35);
  shadow.addColorStop(0,`rgba(43,49,36,${.24-.09*st})`);shadow.addColorStop(1,'rgba(43,49,36,0)');
  ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,r*1.35,0,Math.PI*2);ctx.fill();ctx.restore();
  function path(scale, depth=0) {ctx.beginPath();for(let i=0;i<=96;i++){const q=point(i/96*Math.PI*2,scale,depth);if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q);}ctx.closePath();}
  // Back rim then face; lighting is fixed to the tabletop.
  path(1,-4);ctx.fillStyle='#736449';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#6a604c';ctx.stroke();
  path(1);const face=ctx.createLinearGradient(center.x-r,center.y-r,center.x+r,center.y+r);
  const light=clamp(.5+.35*st*Math.cos(yaw-1),0,1);
  face.addColorStop(0,`hsl(43 31% ${64+light*14}%)`);face.addColorStop(.52,`hsl(42 26% ${52+light*12}%)`);face.addColorStop(1,'#9b8963');
  ctx.fillStyle=face;ctx.fill();ctx.strokeStyle='#d6c79d';ctx.lineWidth=1.6;ctx.stroke();
  path(.87);ctx.strokeStyle='rgba(92,76,44,.45)';ctx.lineWidth=1;ctx.stroke();
  path(.82);ctx.strokeStyle='rgba(243,229,186,.45)';ctx.stroke();
  // Small stamped sun and uneven radial marks make rotation readable without text.
  for(let i=0;i<36;i++) {const a=i*Math.PI/18+spin;const q=point(a,.91),v=point(a,.96);ctx.beginPath();ctx.moveTo(...q);ctx.lineTo(...v);ctx.strokeStyle='rgba(83,70,43,.42)';ctx.stroke();}
  const c=point(spin,.19);ctx.beginPath();
  for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;const q=point(a+spin,.24);const origin=project(0,0,height);const off=[q[0]-origin[0],q[1]-origin[1]];if(!i)ctx.moveTo(c[0]+off[0],c[1]+off[1]);else ctx.lineTo(c[0]+off[0],c[1]+off[1]);}
  ctx.strokeStyle='rgba(86,71,42,.5)';ctx.lineWidth=1.4;ctx.stroke();
  canvas.dataset.motion=state.active?'spinning':'rest';
}
function animate(now) {
  frame=0; const state=step(coin,previous?(now-previous)/1000:0); previous=now;draw(state);
  if(state.active)frame=requestAnimationFrame(animate);else previous=0;
}
function start(distance,ms,direction) {if(flick(coin,distance,ms,direction)){previous=performance.now();if(!frame)frame=requestAnimationFrame(animate);}}
function cancel() {if(gesture){const id=gesture.id;gesture=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}}
canvas.addEventListener('pointerdown',e=>{
  if(gesture || !e.isPrimary || (e.pointerType==='mouse' && e.button!==0))return;
  // A generous target includes the projected rim, even when the disk lies flat.
  if(Math.hypot(e.clientX-w*.5,(e.clientY-h*.53)/.8)>radius+38)return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:e.timeStamp,lastTime:e.timeStamp};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;
  if(e.timeStamp-gesture.lastTime>120){gesture.x=gesture.lastX;gesture.y=gesture.lastY;gesture.time=gesture.lastTime;}
  gesture.lastX=e.clientX;gesture.lastY=e.clientY;gesture.lastTime=e.timeStamp;
});
canvas.addEventListener('pointerup',e=>{if(gesture?.id!==e.pointerId)return;const g=gesture;cancel();
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(e.timeStamp-g.lastTime>180)return;
  start(Math.hypot(dx,dy),e.timeStamp-g.time,dx || -dy);
});
canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
canvas.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();start(45,90,1);}});
addEventListener('blur',cancel);addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{cancel();if(document.hidden){cancelAnimationFrame(frame);frame=0;previous=0;}else if(pose(coin).active){previous=performance.now();frame=requestAnimationFrame(animate);}});
resize();
