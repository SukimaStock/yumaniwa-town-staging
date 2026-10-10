/* Opening kernel extracted as a unit from PUMPOKO journey.js at 7a5fade.
 * Keep the original vessel inertia, moving grains, expanding physical rim,
 * fixed step, opening curve and camera. No seed gameplay enters WORLD LOOP.
 * Adapter changes only units/actual 02 terrain and the root-on-contact exit. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./prologue.js'):root.PumpokoPrologue,
    typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PumpokoOpening=api;
})(typeof window!=='undefined'?window:globalThis,function(D,W){
  'use strict';
  const T=D.TUNE,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const ZOOM=1.85,DURATION=6.4,UNITS=ZOOM/.8;
  const CONTROL=Object.freeze({grabK:220,grabD:21,returnK:70,returnD:10,inertia:3});
  const travelling=s=>s.seeds.filter(p=>!p.lost&&!p.arrival);
  // The original opening coordinate system is retained. Its initial floor
  // is 100 pixels below the cut centre. Only the floor sampler is adapted.
  function geometry(world){
    const START={x:180,y:250},origin={x:-250,y:W.surfaceHeight(-250,world.course)+100*UNITS};
    const worldPoint=p=>({x:origin.x+(p.x-START.x)*UNITS,y:origin.y-(p.y-START.y)*UNITS});
    const floor=x=>{
      const wx=origin.x+(x-START.x)*UNITS,f=W.curve('surface',wx,world.course);
      return {y:START.y+(origin.y-f.y)/UNITS,nx:f.nx,ny:-f.ny,slope:-f.slope,material:'flesh'};
    };
    return {START,END:{left:Infinity,right:Infinity},segments:[],loops:[],floor,
      bounds:{left:START.x+(-430-origin.x)/UNITS,right:START.x+(world.course.finishX-origin.x)/UNITS,lostY:2000},
      featureContacts:()=>[],isRound:()=>false,worldPoint,origin};
  }
  function support(p, nx, ny) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    return Math.hypot(10.3 * (nx * c + ny * s), 5.5 * (-nx * s + ny * c));
  }
  function create(source,world){
    const stage=geometry(world),{START}=stage;
    const s={geometry:stage,time:source.time,accumulator:source.accumulator,held:false,activeId:null,
      x:source.x,y:source.y,vx:source.vx,vy:source.vy,targetX:0,targetY:0,
      ring:source.ring,ringV:source.ringV,contacts:[],marks:[],impactCount:source.impactCount,
      camera:{x:START.x,y:START.y,z:1},cameraLead:0,
      transition:{elapsed:0,progress:0,settled:false},arrivals:[],arrivalEvents:[],seeds:source.seeds};
    for(const [i,p]of s.seeds.entries()){
      p.x+=START.x;p.y=START.y+p.y*.8;p.vy*=.8;p.attached=false;
      p.lost=false;p.inactive=false;p.fallTime=0;p.arrival=null;p.soilTime=0;p.runId=i;
      p.dragFactor=.98+i%4*.014;p.turn=p.angle;p.roll=p.roll||1;
      p.entryLandingUntil=s.time+DURATION+.6;p.entryLandedAt=null;
    }
    return s;
  }
  function opening(s) { return s.transition ? smooth((s.transition.progress - .36) / .57) : 1; }
  function view(s) {
    const o = opening(s), z = s.camera.z;
    return {x:195+s.x*(34-22*o),y:365+s.y*(23-15*o),
      angle:s.x*(.22-.15*o),sx:z*(1+s.ring*.22),sy:z*(1-s.y*.15-s.ring*.18)};
  }
  function screenPoint(s, x, y) {
    const v = view(s), dx = (x - s.camera.x) * v.sx, dy = (y - s.camera.y) * v.sy;
    return { x: v.x + Math.cos(v.angle) * dx - Math.sin(v.angle) * dy,
      y: v.y + Math.sin(v.angle) * dx + Math.cos(v.angle) * dy };
  }
  function contact(s, p, speed, material) {
    if (speed < 17 || p.cool > 0) return;
    p.cool = .09; s.impactCount++; s.contacts.push({ x: p.x, y: p.y, speed, material });
  }
  function wall(s, p, nx, ny, penetration, material, entryFloor = false) {
    if (penetration <= 0) return;
    p.x += nx * penetration; p.y += ny * penetration;
    const vn = p.vx * nx + p.vy * ny;
    if(entryFloor&&ny<-.5&&p.entryLandingUntil!==null) {
      if(vn<0&&s.time<=p.entryLandingUntil)p.entryLandedAt=s.time;
      p.entryLandingUntil=null;
    }
    if (vn < 0) {
      const soil=p.x>=s.geometry.END.left&&p.x<=s.geometry.END.right&&ny<-.5;
      const bounce = soil || material === 'cushion' ? .08 : .22;
      p.vx -= (1 + bounce) * vn * nx; p.vy -= (1 + bounce) * vn * ny;
      p.spin += (p.vx * ny - p.vy * nx) * .005; contact(s, p, -vn, material);
    }
  }
  function boundary(s, p, o = opening(s)) {
    const {START,segments,floor,bounds}=s.geometry;
    if (o < 1) {
      // The visible rim expands and unrolls together with its physical boundary.
      const radius = 94 + o * 1150, dx = p.x - START.x, dy = (p.y - START.y) / .8;
      const r = Math.hypot(dx, dy), len = Math.hypot(dx, dy / .8) || 1;
      if (r > radius) wall(s, p, -dx / len, -dy / .8 / len, (r - radius) * .8, 'rim');
    }
    if (o > 0) for (let n = 0; n < 3; n++) {
      const f = floor(p.x), lift = (1 - o) * 700;
      if (f && p.previousY <= f.y + lift) {
        const penetration = (p.y - f.y - lift) * -f.ny + support(p, f.nx, f.ny);
        wall(s, p, f.nx, f.ny, penetration, f.material, true);
      }
      for (const hit of s.geometry.featureContacts(p,support)) wall(s,p,hit.nx,hit.ny,hit.penetration,hit.material);
      for (const segment of segments) for (const [edge, nx] of [[segment.samples[0], -1], [segment.samples.at(-1), 1]]) {
        if (p.y <= edge.y + lift || Math.abs(p.x - edge.x) > support(p, 1, 0)) continue;
        wall(s, p, nx, 0, support(p, 1, 0) - (p.x - edge.x) * nx, 'rim');
      }
      wall(s, p, 1, 0, bounds.left + support(p, 1, 0) - p.x, 'rim');
      wall(s, p, -1, 0, p.x + support(p, 1, 0) - bounds.right, 'rim');
    }
  }
  function step(s,dt){
    const {START,END,floor}=s.geometry;s.time+=dt;
    if (s.transition) {
      s.transition.elapsed = Math.min(DURATION, s.transition.elapsed + dt);
      s.transition.progress = s.transition.elapsed / DURATION;
      s.transition.settled = s.transition.elapsed >= DURATION;
    }
    const o = opening(s), blend = (a,b) => a+(b-a)*o;
    const k = s.held ? blend(T.grabK,CONTROL.grabK) : blend(T.returnK,CONTROL.returnK);
    const d = s.held ? blend(T.grabD,CONTROL.grabD) : blend(T.returnD,CONTROL.returnD);
    // Match the smaller Stage 1 world translation. This is vessel inertia,
    // shared by the party, never a seed-directed impulse or jump boost.
    const inertia = blend(9,CONTROL.inertia);
    const ax = k * (s.targetX - s.x) - d * s.vx, ay = k * (s.targetY - s.y) - d * s.vy;
    s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    s.ringV += (-490 * s.ring - 9 * s.ringV) * dt; s.ring += s.ringV * dt;
    for (const p of s.seeds) {
      if (p.inactive || p.arrival) continue;
      if (p.lost) {
        p.fallTime += dt; p.vy += 360 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
        if (p.y > s.geometry.bounds.lostY + 400 || p.fallTime > 2) p.inactive = true;
        continue;
      }
      p.previousY = p.y;
      if(s.geometry.loops.length)p.previousX=p.x;
      p.cool = Math.max(0, p.cool - dt);
      const f = floor(p.x), dx = p.x - START.x, dy = p.y - START.y;
      const concave = (.25 + Math.hypot(dx, dy / .8) * .013) * (1 - o);
      const fx = T.gravity * s.x - ax * inertia - dx * concave;
      const fy = ((T.gravity * s.y - ay * inertia) * .8 - dy * concave) * (1 - o)
        + 360 * o; // Stage 1 vertical drag is a gesture, never sustained lift.
      p.vx += fx * dt; p.vy += fy * dt;
      const feature = s.geometry.featureContacts(p,support).find(hit=>Math.abs(hit.penetration)<2);
      const ground = feature || f;
      const grounded = !!feature || f && Math.abs((p.y - f.y) * -f.ny + support(p, f.nx, f.ny)) < 2;
      const cross = Math.abs(-Math.sin(p.angle) * p.vx + Math.cos(p.angle) * p.vy) / Math.max(1, Math.hypot(p.vx, p.vy));
      const inRound = !!feature || s.geometry.isRound(p.x);
      const friction = grounded ? (inRound ? 7 + cross * 2 : ground.material === 'polished' ? 3 : 7 + cross * 3) : 0;
      const soil = o===1 && grounded && p.x>=END.left && p.x<=END.right && p.y<f.y;
      const drag = (soil ? 5.5 : (.65 * (1-o) + (!grounded ? 1.0 : inRound ? .30 : ground.material === 'polished' ? 1.15 : 1.35) * o)) * p.dragFactor;
      const loss = Math.exp(-drag * dt) * Math.max(0, 1 - friction * dt / Math.max(.01, Math.hypot(p.vx, p.vy)));
      p.vx *= loss; p.vy *= loss; p.x += p.vx * dt; p.y += p.vy * dt;
      p.spin += ((p.vx + p.vy * .35) / 26 - p.spin) * (1 - Math.exp(-4 * dt));
      p.angle += p.spin * dt; p.turn += (p.vx * Math.sin(p.angle) - p.vy * Math.cos(p.angle)) / 35 * dt;
      p.roll += ((.73 + .27 * Math.abs(Math.cos(p.turn))) - p.roll) * o * (1 - Math.exp(-6 * dt));
      boundary(s, p, o);
    }
    for (let i = 0; i < s.seeds.length; i++) for (let j = i + 1; j < s.seeds.length; j++) {
      const a = s.seeds[i], b = s.seeds[j], dx = b.x - a.x, dy = b.y - a.y;
      if (a.lost || b.lost || a.arrival || b.arrival) continue;
      const distance = Math.hypot(dx, dy) || .01, nx = dx / distance, ny = dy / distance;
      const reach = support(a, nx, ny) + support(b, nx, ny);
      if (distance >= reach) continue;
      const overlap = (reach - distance) * .51;
      a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = -(1 + T.seedBounce) * relative / 2;
        a.vx -= nx * impulse; a.vy -= ny * impulse; b.vx += nx * impulse; b.vy += ny * impulse;
        contact(s, a, -relative, 'seed');
      }
    }
    for (const p of travelling(s)) {
      boundary(s, p, o);
      // Below every possible landing surface: the fall can no longer be saved.
      // Keep its object and a short visible fall, but stop following/colliding.
      if (o === 1 && p.y > s.geometry.bounds.lostY) { p.lost = true; p.fallTime = 0; }
    }
    // Root only on the actual, fully unfolded surface, after the same .24s
    // stable top contact used by the original arrivals. No destination exists.
    if(o===1)for(const p of travelling(s)){
      const f=floor(p.x),gap=f?(p.y-f.y)*-f.ny+support(p,f.nx,f.ny):Infinity;
      p.soilTime=f&&p.y<f.y&&Math.abs(gap)<1.2&&Math.hypot(p.vx,p.vy)<95?p.soilTime+dt:0;
      if(p.soilTime>=.24){
        const arrival=Object.freeze({seed:p,id:p.runId,at:s.time,x:p.x,y:p.y,rootY:f.y,angle:p.angle,roll:p.roll});
        p.arrival=arrival;p.vx=p.vy=p.spin=0;s.arrivals.push(arrival);s.arrivalEvents.push(arrival);
      }
    }
  }
  function camera(s,dt){
    const {START}=s.geometry;
    // Original median/velocity follow, retaining rooted grains in its party.
    // Local rooting occurs during the final opening frames; dropping members
    // here would jump its transition anchor before the original follow settles.
    const active = s.seeds.filter(p=>!p.lost);
    if (!active.length) return; // Hold the last seed view after actual rooting.
    const xs = active.map(p => p.x), ys = active.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const sorted = xs.slice().sort((a,b) => a-b);
    // A lone distant grain must not drag the camera into an empty gap. Keep
    // the actual middle of the party visible; this changes only the view.
    const centre = sorted[Math.floor(sorted.length / 2)];
    const z = clamp(350 / (maxX - minX + 65), 1.15, ZOOM);
    const o = opening(s);
    // Keep the party median as the anchor, but reveal more of the route when
    // the group is genuinely travelling right. Positive velocity is sampled
    // by median too, so one launched/stranded grain cannot steer the view.
    const vxs = active.map(p=>p.vx).sort((a,b)=>a-b);
    const partyVx = vxs[Math.floor(vxs.length / 2)];
    const leadTarget = clamp((partyVx - 18) * .55, 0, 82);
    const leadFollow = 1 - Math.exp(-(leadTarget > s.cameraLead ? 2.8 : 4.5) * dt);
    s.cameraLead += (leadTarget - s.cameraLead) * leadFollow;
    const targetX = centre + s.cameraLead;
    if (s.transition && !s.transition.settled) {
      const t = smooth(s.transition.progress);
      s.camera.z = 1 + (ZOOM - 1) * t;
      s.camera.x = START.x + (targetX - START.x) * t;
      s.camera.y = START.y + (Math.max(START.y, maxY - 90) - START.y) * o;
    } else {
      const follow = 1 - Math.exp(-3 * dt);
      s.camera.x += (targetX - s.camera.x) * follow;
      s.camera.y += (Math.max(START.y, maxY - 90) - s.camera.y) * follow;
      s.camera.z += (z - s.camera.z) * (1 - Math.exp(-1.8 * dt));
    }
  }
  function update(s,elapsed){
    s.contacts.length=0;s.arrivalEvents.length=0;s.accumulator+=clamp(elapsed,0,.06);
    while(s.accumulator>=T.step){step(s,T.step);s.accumulator-=T.step;}
    camera(s,clamp(elapsed,0,.06));
  }
  // Original ending growth curve, without ending layout / rewards / camera.
  const ENDING={growthDuration:2.25},FRUIT={heroOvershoot:.20,overshoot:.14};
  function fruitGrowth(age,bonus=false) {
    const u=clamp((age-1.4)/(ENDING.growthDuration-1.4),0,1);
    const peak=1+(bonus?FRUIT.heroOvershoot:FRUIT.overshoot);
    if(u<.64)return peak*smooth(u/.64);
    if(u<.85)return peak+(.97-peak)*smooth((u-.64)/.21);
    return .97+.03*smooth((u-.85)/.15);
  }

  function frame(s){
    const v=view(s),p=s.geometry.worldPoint(s.camera),o=opening(s);
    return {x:p.x+(195-v.x)*UNITS/v.sx,y:p.y-(340-v.y)*UNITS/v.sy,z:s.camera.z/UNITS,
      screen:{x:v.x,y:740-v.y,angle:-v.angle,sx:v.sx/UNITS,sy:v.sy/UNITS,camera:p},
      air:o,ground:smooth(o*2),lift:(1-o)*700*UNITS};
  }
  return {create,update,opening,view,screenPoint,support,fruitGrowth,frame,smooth,DURATION,UNITS};
});
