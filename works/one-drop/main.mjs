import { createState, step, clamp, dropShape } from './model.mjs';
const $ = id => document.getElementById(id);
const bulb = $('bulb'), scene = $('scene'), s = createState();
let drag = null, keyHeld = false, last = performance.now();
function localY(e) { return new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.getScreenCTM().inverse()).y; }
function release() {
 const id = drag?.id; drag = null; keyHeld = false; s.target = 0;
 bulb.classList.remove('dragging');
 if (id !== undefined && bulb.hasPointerCapture(id)) bulb.releasePointerCapture(id);
}
bulb.addEventListener('pointerdown', e => {
 if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
 e.preventDefault(); bulb.focus({preventScroll:true});
 drag = {id:e.pointerId,y:localY(e),start:s.target};
 bulb.setPointerCapture(e.pointerId); bulb.classList.add('dragging');
});
bulb.addEventListener('pointermove', e => {
 if (e.pointerId !== drag?.id) return;
 e.preventDefault(); s.target = clamp(drag.start + (localY(e)-drag.y)/78);
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) bulb.addEventListener(type,e=>{if(e.pointerId===drag?.id)release();});
window.addEventListener('blur',release);
document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
window.addEventListener('resize',release);
bulb.addEventListener('blur',release);
bulb.addEventListener('keydown',e=>{
 if (drag) return;
 if (['ArrowDown','ArrowUp','Home','End',' ','Enter','Escape'].includes(e.key)) e.preventDefault();
 else return;
 if (e.key==='ArrowDown') s.target=clamp(s.target+.08);
 if (e.key==='ArrowUp') s.target=clamp(s.target-.08);
 if (['Home','Escape'].includes(e.key)) s.target=0;
 if (e.key==='End') s.target=1;
 if ([' ','Enter'].includes(e.key)) {keyHeld=true;s.target=1;}
});
bulb.addEventListener('keyup',e=>{if(keyHeld&&[' ','Enter'].includes(e.key))release();});
function render() {
 const d = dropShape(s.volume,s.neck);
 $('rubber-shape').setAttribute('transform',`translate(180 184) scale(${1+s.press*.1} ${1-s.press*.34}) translate(-180 -184)`);
 $('attached').setAttribute('d',d.path);
 $('glint').setAttribute('d',`M${180-d.r*.55} ${d.cy-d.r*.35} q${-d.r*.2} ${d.r*.35} 0 ${d.r*.65}`);
 bulb.setAttribute('aria-valuenow',String(Math.round(s.target*100)));
 bulb.dataset.drops=String(s.drops); bulb.dataset.neck=String(s.neck);
 $('falling').setAttribute('visibility',s.fall?'visible':'hidden');
 if(s.fall) {
  $('falling').setAttribute('cx',180);$('falling').setAttribute('cy',s.fall.y);
  const stretch=Math.max(0,1-s.fall.age*5);
  $('falling').setAttribute('rx',14-stretch*3);$('falling').setAttribute('ry',14+stretch*7);
 }
 const r=s.ripple;
 $('ripple').setAttribute('rx',String(3+r*51));$('ripple').setAttribute('ry',String(1+r*9));
 $('ripple').setAttribute('opacity',String((1-r)*.55));
}
function tick(now) { step(s,(now-last)/1000); last=now; render();requestAnimationFrame(tick); }
render();requestAnimationFrame(tick);
