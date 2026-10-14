const canvas = document.querySelector('#fur');
const ctx = canvas.getContext('2d');
// Fixed material coordinates keep every hair and every stroke through resizing.
const W = 640, H = 560, spacing = 3.8;
const hairs = [];
let seed = 137;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
for (let y = 0; y < H; y += spacing) {
  for (let x = 0; x < W; x += spacing) {
    const jitterX = random(), jitterY = random(), tone = random();
    hairs.push({ x: x + jitterX * spacing, y: y + jitterY * spacing,
      dx: .15, dy: .55, tone, length: 3.5 + random() * 2.6 });
  }
}
// Keep redraws local to the finger; roots are stored in a regular grid.
const columns = Math.ceil(W / spacing), rows = Math.ceil(H / spacing);
let dirty = {x: 0, y: 0, right: W, bottom: H};
function invalidate(x = 0, y = 0, right = W, bottom = H) {
  dirty = dirty ? {x: Math.min(dirty.x, x), y: Math.min(dirty.y, y),
    right: Math.max(dirty.right, right), bottom: Math.max(dirty.bottom, bottom)} : {x, y, right, bottom};
}
function visit(x, y, right, bottom, fn) {
  const x0 = Math.max(0, Math.floor(x / spacing)), x1 = Math.min(columns - 1, Math.floor(right / spacing));
  const y0 = Math.max(0, Math.floor(y / spacing)), y1 = Math.min(rows - 1, Math.floor(bottom / spacing));
  for (let row = y0; row <= y1; row++) {
    for (let col = x0; col <= x1; col++) fn(hairs[row * columns + col]);
  }
}
let pointer = null, previous = null, pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; draw(); });
}
function draw() {
  if (!dirty) return;
  const region = dirty; dirty = null;
  // Fixed tiles make partial and full redraws use identical raster boundaries.
  const tile = 64;
  for (let y = Math.max(0, Math.floor(region.y / tile) * tile); y < Math.min(H, region.bottom); y += tile) {
    for (let x = Math.max(0, Math.floor(region.x / tile) * tile); x < Math.min(W, region.right); x += tile) {
      drawTile(x, y, Math.min(W, x + tile), Math.min(H, y + tile));
    }
  }
}
function drawTile(left, top, edge, foot) {
  const sx = canvas.width / W, sy = canvas.height / H;
  const x = Math.floor(left * sx) / sx, y = Math.floor(top * sy) / sy;
  const right = Math.floor(edge * sx) / sx, bottom = Math.floor(foot * sy) / sy;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, right - x, bottom - y); ctx.clip();
  ctx.fillStyle = '#8d9873'; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  // Batch similar shades: a few canvas strokes rather than two per hair.
  const shades = Array.from({length: 28}, () => new Path2D());
  visit(x - 8, y - 8, right + 8, bottom + 8, h => {
    const light = h.dx * -.55 + h.dy * -.83;
    const l = 48 + light * 17 + (h.tone - .5) * 6;
    const path = shades[Math.max(0, Math.min(27, Math.round((l - 26) / 1.6)))];
    path.moveTo(h.x, h.y);
    path.lineTo(h.x + h.dx * h.length, h.y + h.dy * h.length);
  });
  for (let i = 0; i < shades.length; i++) {
    ctx.strokeStyle = `hsl(79 17% ${26 + i * 1.6}%)`;
    ctx.lineWidth = 1.35;
    ctx.stroke(shades[i]);
  }
  const light = ctx.createRadialGradient(W*.35,H*.22,20,W*.5,H*.5,W*.7);
  light.addColorStop(0,'#eff0c30b');light.addColorStop(1,'#29361a30');
  ctx.fillStyle=light;ctx.fillRect(0,0,W,H);ctx.restore();
}
function point(e) {
  const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};
}
function stroke(a,b) {
  const vx=b.x-a.x,vy=b.y-a.y,d=Math.hypot(vx,vy);
  if(d<.15)return;
  const rect=canvas.getBoundingClientRect();
  const rx=27*W/rect.width,ry=27*H/rect.height;
  const left = Math.min(a.x, b.x) - rx, top = Math.min(a.y, b.y) - ry;
  const right = Math.max(a.x, b.x) + rx, bottom = Math.max(a.y, b.y) + ry;
  visit(left, top, right, bottom, h => {
    const t=Math.max(0,Math.min(1,((h.x-a.x)*vx+(h.y-a.y)*vy)/(d*d)));
    const distance=Math.hypot((h.x-a.x-vx*t)/rx,(h.y-a.y-vy*t)/ry);
    if(distance>=1)return;
    const influence=Math.min(1,d/8)*Math.pow(1-distance*distance, .65);
    h.dx+=(vx/d-h.dx)*influence;h.dy+=(vy/d-h.dy)*influence;
  });
  invalidate(left - 8, top - 8, right + 8, bottom + 8);
  schedule();
}
function end(e){
  if(e && e.pointerId!==pointer)return;
  const old=pointer;pointer=null;previous=null;
  if(old!==null && canvas.hasPointerCapture(old))canvas.releasePointerCapture(old);
}
canvas.addEventListener('pointerdown',e=>{
  if(pointer!==null || (e.pointerType==='mouse' && e.button!==0))return;
  pointer=e.pointerId;previous=point(e);canvas.setPointerCapture(pointer);e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer)return;
  const samples=e.getCoalescedEvents?.();
  for(const sample of samples?.length?samples:[e]){
    const next=point(sample);stroke(previous,next);previous=next;
  }
});
canvas.addEventListener('pointerup',e=>{
  if(e.pointerId===pointer && previous)stroke(previous,point(e));end(e);
});
canvas.addEventListener('pointercancel',end);
canvas.addEventListener('lostpointercapture',end);
window.addEventListener('blur',()=>end());
document.addEventListener('visibilitychange',()=>{if(document.hidden)end();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('keydown',e=>{
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const dir=directions[e.key];if(!dir)return;e.preventDefault();
  stroke({x:W/2-dir[0]*90,y:H/2-dir[1]*90},{x:W/2+dir[0]*90,y:H/2+dir[1]*90});
});
document.querySelector('#reset').addEventListener('click',()=>{
  end();for(const h of hairs){h.dx=.15;h.dy=.55;}invalidate();schedule();
});
new ResizeObserver(()=>{
  end();const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);invalidate();schedule();
}).observe(canvas);
