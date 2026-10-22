'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const svg = $('scene'), handle = $('handle');
  const origin = {x: 270, y: 326};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pointer = null, start = null, attached = true;
  let target = {x: 0, y: 0}, shown = {x: 0, y: 0}, lift = 0;
  let frame = 0, last = 0;
  const length = p => Math.hypot(p.x, p.y);
  const attr = (id, values) => Object.entries(values).forEach(([key,value]) => $(id).setAttribute(key,value));
  function rimPath(dx, dy, open = false) {
    const points = [];
    const from = open ? .98 : 0, to = open ? Math.PI * 2 + .43 : Math.PI * 2;
    for (let i = 0; i <= 96; i++) {
      const a = from + (to - from) * i / 96;
      const diff = Math.atan2(Math.sin(a - .72), Math.cos(a - .72));
      const influence = Math.exp(-diff * diff / .28);
      points.push(`${i ? 'L' : 'M'}${200 + Math.cos(a)*88 + dx*influence},${280 + Math.sin(a)*65 + dy*influence}`);
    }
    return points.join(' ') + (open ? '' : ' Z');
  }
  function paint() {
    const distance = length(shown), peel = attached ? Math.min(1, distance/90) : 0;
    const dx = attached ? shown.x * .56 : 0, dy = attached ? shown.y * .56 - peel*15 : 0;
    const tx = attached ? 0 : shown.x*.82, ty = attached ? 0 : shown.y*.82 - lift*12;
    attr('cup',{transform:`translate(${tx} ${ty}) rotate(${-lift*9} 200 280)`});
    attr('rim',{d:rimPath(dx,dy)});
    attr('rim-light',{d:rimPath(dx*.96,dy*.96,true)});
    attr('contact',{d:rimPath(0,0,peel>.08),opacity:attached ? .5*(1-peel*.65) : 0});
    attr('mark',{opacity:attached ? 0 : .55});
    // Scale about the dome center rather than the SVG origin.
    for (const id of ['dome','shine','stem','stem-top']) attr(id,{transform:`translate(200 267) scale(${1-peel*.09} ${1+peel*.12}) translate(-200 -267) translate(${dx*.25} ${dy*.25-lift*3})`});
    const hx = origin.x + (attached ? dx : 0), hy = origin.y + (attached ? dy : 0);
    attr('fold',{d:`M251 312 Q${hx-13} ${hy-22-peel*12} ${hx+9} ${hy-9} L${hx-4} ${hy+9} Q${hx-17} ${hy-6} 245 323Z`,opacity:.3+peel*.7});
    // Keep the handle on the same rotated geometry as the detached cup.
    const angle = -lift*9*Math.PI/180;
    const x = attached ? hx : 200 + (origin.x-200)*Math.cos(angle)-(origin.y-280)*Math.sin(angle)+tx;
    const y = attached ? hy : 280 + (origin.x-200)*Math.sin(angle)+(origin.y-280)*Math.cos(angle)+ty;
    attr('handle',{transform:`translate(${x} ${y}) rotate(${-lift*9})`,'aria-valuenow':attached ? Math.round(peel*99) : 100,'aria-valuetext':attached ? (peel<.02?'吸着': '縁がめくれています') : '離れています','data-state':attached?'attached':'detached','data-dragging':pointer!==null});
    attr('shadow',{cx:200+tx*.5,cy:294+ty*.5,rx:88+lift*5,opacity:attached?.16:.08});
  }
  function tick(now) {
    const dt = Math.min((now-last)/1000 || 1/60,.04); last=now;
    const follow = reduced.matches ? 1 : 1-Math.exp(-24*dt);
    shown.x += (target.x-shown.x)*follow; shown.y += (target.y-shown.y)*follow;
    lift += ((attached?0:1)-lift)*(reduced.matches?1:1-Math.exp(-18*dt));
    paint();
    if (Math.hypot(target.x-shown.x,target.y-shown.y)>.03 || Math.abs((attached?0:1)-lift)>.002) frame=requestAnimationFrame(tick);
    else { shown={...target}; lift=attached?0:1; paint(); frame=0; }
  }
  function wake() { if (!frame) {last=performance.now();frame=requestAnimationFrame(tick);} }
  function move(x,y) {
    // Bound the travel so the cup always remains available after release.
    target={x:Math.max(-105,Math.min(105,x)),y:Math.max(-160,Math.min(135,y))};
    if (attached && length(target)>=90) attached=false;
    wake();
  }
  function end(cancel=false) {
    const old=pointer; pointer=null; start=null;
    if (attached) target={x:0,y:0};
    else if (!cancel && length(target)<24) {attached=true;target={x:0,y:0};}
    handle.classList.remove('dragging');
    if (old!==null && handle.hasPointerCapture(old)) handle.releasePointerCapture(old);
    wake();
  }
  function point(e) {
    const matrix=svg.getScreenCTM();
    return matrix ? new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()) : null;
  }
  handle.addEventListener('pointerdown', e => {
    if (pointer!==null || !e.isPrimary || e.button!==0) return;
    const p=point(e); if (!p) return;
    e.preventDefault(); pointer=e.pointerId;
    start={x:p.x,y:p.y,offset:{...target}};
    handle.focus({preventScroll:true}); handle.setPointerCapture(pointer); handle.classList.add('dragging'); paint();
  });
  handle.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;
    const p=point(e); if(p)move(start.offset.x+p.x-start.x,start.offset.y+p.y-start.y);
  });
  handle.addEventListener('pointerup',e=>{if(e.pointerId===pointer)end();});
  for(const type of ['pointercancel','lostpointercapture'])handle.addEventListener(type,e=>{if(e.pointerId===pointer)end(true);});
  handle.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home'].includes(e.key))return;
    e.preventDefault(); if(pointer!==null)end(true);
    if(e.key==='Home'){attached=true;target={x:0,y:0};wake();return;}
    const outward=e.key==='ArrowRight'||e.key==='ArrowDown';
    const amount=Math.max(0,length(target)+(outward?15:-15));
    move(amount*.6,amount*.8);
    if(!outward&&!attached&&length(target)<24) {attached=true;target={x:0,y:0};wake();}
  });
  function sizeHitArea() {
    const scale=svg.getScreenCTM()?.a;
    if(scale) $('hit-area').setAttribute('r',Math.max(36,22/scale));
  }
  window.addEventListener('blur',()=>end(true));
  window.addEventListener('resize',()=>{end(true);sizeHitArea();});
  window.addEventListener('pagehide',()=>{end(true);cancelAnimationFrame(frame);frame=0;});
  window.addEventListener('pageshow',()=>{sizeHitArea();wake();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){end(true);cancelAnimationFrame(frame);frame=0;}else wake();});
  sizeHitArea();
  paint();
})();
