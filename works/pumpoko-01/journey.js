(function (root) {
  'use strict';
  const D = root.PumpkinDynamics || require('./dynamics.js'), T = D.TUNE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const G = root.PumpkinStageGeometry || require('./stage-geometry.js');
  const stageData = root.PumpkinStageData || require('./stage-data.js');
  const geometry = G.compile(stageData);
  const { START, END, ROUND, segments, terrain, GAP, floor, field } = geometry;
  const ZOOM = 1.85, DURATION = 6.4;
  // Presentation history only; never read by seed physics or arrival rules.
  const cameraMotion=new WeakMap(),arrivalTail=new WeakMap();
  const CONTROL = Object.freeze({ grabK:220, grabD:21, returnK:70, returnD:10, inertia:3 });
  const ASSIST = Object.freeze({ gesture:.12, rearm:.08, sideways:.12, coyote:.12, contactSlop:.75,
    minSpeed:55, fullSpeed:230, maxLift:180, landTime:.06 });
  // Input edges, not held gravity: horizontal propulsion never loses strength
  // to an upward gesture. Each grain spends only its own recent ground speed.
  function beginDrag(s) { s.gestureAssist={armed:true,peakY:0,lastX:0,lastY:0,side:0,down:0,direction:0}; }
  function drag(s,x,y) {
    s.targetX=clamp(x,-T.maxTilt,T.maxTilt);s.targetY=clamp(y,-T.maxTilt,T.maxTilt);
    const g=s.gestureAssist;
    if(Math.abs(s.targetX)>.04)g.direction=Math.sign(s.targetX);
    const dx=x-g.lastX,dy=y-g.lastY;g.lastX=x;g.lastY=y;
    if(!g.armed) {
      g.side+=Math.abs(dx);g.down=Math.max(0,g.down+dy);
      if(g.side>=ASSIST.sideways||g.down>=ASSIST.rearm) {
        g.armed=true;g.peakY=y;g.side=g.down=0;
      }
      return; // A sideways/down stroke rearms; it never also launches.
    }
    g.peakY=Math.max(g.peakY,y);
    if(dy>=0||g.peakY-y<ASSIST.gesture)return;
    g.armed=false;g.side=g.down=0;
    if(!s.held||s.result||opening(s)<1||s.transition&&!s.transition.settled)return;
    const direction=g.direction;
    if(!direction)return;
    for(const p of travelling(s)) {
      const a=p.assist;
      if(a.used||s.time-a.at>ASSIST.coyote)continue;
      const speed=Math.max(0,direction*a.speed);
      const lift=ASSIST.maxLift*smooth((speed-ASSIST.minSpeed)/(ASSIST.fullSpeed-ASSIST.minSpeed));
      if(lift<=0)continue;
      // Consume on the gesture. Holding up cannot wait for sufficient speed,
      // and another airborne gesture cannot buy another impulse.
      p.vy-=lift;a.used=true;a.groundTime=0;a.count++;a.lastLift=lift;
    }
  }
  // Read-only run-local observation. These limits never enter collision/control.
  // Distance calibration and actual-input samples are recorded in JUMP-NOTES.md.
  const JUMP = Object.freeze({ contactSlop:.75, groundTime:.04, landingTime:.025,
    airTime:.10, rise:2, minDistance:80, fullDistance:360, fruitBonus:.08 });
  function jumpRecord() { return { best:0, grounded:0, armed:false, last:null, flight:null, landing:null, recent:null }; }
  function jumpAmount(distance) { return smooth((distance-JUMP.minDistance)/(JUMP.fullDistance-JUMP.minDistance)); }
  function observeJump(r, p, contact, dt) {
    if(p.lost||p.inactive) { r.flight=r.landing=null;r.armed=false;r.grounded=0;return; }
    if(contact.touching) {
      if(r.flight) {
        const f=r.flight;
        if(!contact.landing) { r.flight=r.landing=null;r.armed=false; }
        else {
          if(!r.landing)r.landing={x:p.x,y:p.y,time:0}; // First contact, never rolling/debounce distance.
          r.landing.time+=dt;
          if(r.landing.time>=JUMP.landingTime) {
            const distance=r.landing.x-f.x;
            if(f.time>=JUMP.airTime&&f.y-f.minY>=JUMP.rise&&distance>JUMP.minDistance) {
              r.best=Math.max(r.best,distance);
              r.recent={takeoffX:f.x,landingX:r.landing.x,distance};
            }
            r.flight=r.landing=null;r.armed=false;
          }
        }
      }
      r.grounded=contact.landing?r.grounded+dt:0;
      if(!r.flight&&r.grounded>=JUMP.groundTime)r.armed=true;
      if(contact.landing)r.last={x:p.x,y:p.y};
      else r.armed=false;
    } else {
      r.grounded=0;
      if(r.landing) { r.flight=r.landing=null;r.armed=false; } // Unstable landing is not success.
      if(!r.flight&&r.armed&&r.last)r.flight={...r.last,minY:p.y,time:0};
      if(r.flight) { r.flight.time+=dt;r.flight.minY=Math.min(r.flight.minY,p.y); }
      r.armed=false;
    }
  }
  function terrainContact(s,p) {
    const f=s.geometry.floor(p.x), slop=JUMP.contactSlop;
    const top=!!f&&p.y<f.y&&Math.abs((p.y-f.y)*-f.ny+support(p,f.nx,f.ny))<=slop;
    const hits=s.geometry.featureContacts(p,support).filter(h=>Math.abs(h.penetration)<=slop);
    // Contact anywhere on a Loop interrupts a free flight; only upward support
    // can receive it. Seed pairs, outside walls and sound cooldowns are not ground.
    return {touching:top||hits.length>0,landing:top&&f.ny<-.5||hits.some(h=>h.ny<-.5)};
  }
  const jump=Object.freeze({create:jumpRecord,observe:observeJump,amount:jumpAmount,contact:terrainContact,TUNE:JUMP});
  // party remains the surviving result, including rooted seeds.
  function party(s) { return s.seeds.filter(p => !p.lost); }
  function travelling(s) { return s.seeds.filter(p => !p.lost && !p.arrival); }
  function farm(g) {
    const samples = [], {left,right} = g.END;
    for (let i=0;i<=40;i++) { const x=left+(right-left)*i/40, f=g.floor(x); samples.push({x,y:f.y}); }
    const top=Math.min(...samples.map(p=>p.y))-110, bottom=Math.max(...samples.map(p=>p.y))+85;
    return {left,right,samples,frame:{x:(left+right)/2,y:(top+bottom)/2,z:Math.min(1.05,340/(right-left+110),500/(bottom-top+70))}};
  }
  const ENDING = Object.freeze({ growAt:.90, stagger:.34, growthDuration:2.25,
    closeZoom:1.75, heroScreenX:285, framePadding:28,
    cameraDelay:.50, cameraAcceleration:.20, resultHold:1.0,
    replayAt:6.7, zoomDuration:3.8, connectDuration:1.2, emptyReplayAt:2.4, emptyDuration:1.2 });
  // Fruit rests on the same sampled soil as its root, even on a sloping draft.
  // This is a drawing pose only: arrivals, seeds and collision are never moved.
  const FRUIT = Object.freeze({ allArrivedBonus:1.24, overshoot:.14, heroOvershoot:.20 });
  const preferredPlantX=(s,a)=>clamp(a.x+8,s.geometry.END.left+14,s.geometry.END.right-14);
  const fruitLayouts=new WeakMap();
  function perfectHero(s,a) {
    const arrivals=s.result?.arrivals||[];
    return arrivals.length===9&&s.result.total===9&&arrivals.every(b=>preferredPlantX(s,b)<preferredPlantX(s,a)||preferredPlantX(s,b)===preferredPlantX(s,a)&&b.id<=a.id);
  }
  function plantX(s,a) {
    const result=s.result,cached=fruitLayouts.get(result);
    if(cached?.geometry===s.geometry)return cached.positions.get(a)??preferredPlantX(s,a);
    const order=result.arrivals.slice().sort((a,b)=>preferredPlantX(s,a)-preferredPlantX(s,b)||a.id-b.id);
    const lo=s.geometry.END.left+14,hi=s.geometry.END.right-14;
    const density=Math.max(.62,1-(order.length-1)*.05);
    // Layout reserves full jump richness and the growth overshoot, so reward
    // changes and individual growth events never move a fruit or its camera.
    const radii=order.map(a=>22*(.95+a.id%3*.025)*density*1.08*
      (perfectHero(s,a)?FRUIT.allArrivedBonus*(1+FRUIT.heroOvershoot):1+FRUIT.overshoot));
    // Keep each centre outside its neighbour's largest silhouette. A little
    // edge overlap belongs to this organic cluster; full rows are unnecessary.
    const gaps=radii.slice(1).map((r,i)=>Math.max(r,radii[i])+2);
    const span=gaps.reduce((sum,gap)=>sum+gap,0);
    // A narrow nursery may need modest silhouette overlap; centres remain
    // distinct. Do not shrink, merge, delete or relocate the physical seeds.
    const fit=Math.min(1,(hi-lo)/Math.max(1,span));
    const xs=order.map(a=>preferredPlantX(s,a));
    for(let i=1;i<xs.length;i++)xs[i]=Math.max(xs[i],xs[i-1]+gaps[i-1]*fit);
    if(xs.length)xs[xs.length-1]=Math.min(hi,xs.at(-1));
    for(let i=xs.length-2;i>=0;i--)xs[i]=Math.min(xs[i],xs[i+1]-gaps[i]*fit);
    const positions=new Map(order.map((a,i)=>[a,xs[i]]));
    fruitLayouts.set(result,{geometry:s.geometry,positions});
    return positions.get(a)??preferredPlantX(s,a);
  }
  // Finite, time-based growth: swell, a small compression, then exact rest.
  function fruitGrowth(age,bonus=false) {
    const u=clamp((age-1.4)/(ENDING.growthDuration-1.4),0,1);
    const peak=1+(bonus?FRUIT.heroOvershoot:FRUIT.overshoot);
    if(u<.64)return peak*smooth(u/.64);
    if(u<.85)return peak+(.97-peak)*smooth((u-.64)/.21);
    return .97+.03*smooth((u-.85)/.15);
  }
  function plantPose(s, a) {
    const density=Math.max(.62,1-(s.result.arrivals.length-1)*.05);
    const bonus=perfectHero(s,a);
    const reward=clamp(a.reward||0,0,1), size=(.95+a.id%3*.025)*density*(1+JUMP.fruitBonus*smooth((reward-.45)/.55))*(bonus?FRUIT.allArrivedBonus:1);
    const x=plantX(s,a);
    return { x, y:s.geometry.floor(x).y-13*size+1, size, density, reward, bonus };
  }
  function endingTiming(s) {
    const count=s.result?.arrivals.length||0;
    const growthEnd=count?ENDING.growAt+(count-1)*ENDING.stagger+ENDING.growthDuration:0;
    return {cameraStart:ENDING.growAt+ENDING.cameraDelay,growthEnd,
      titleZoomAt:count?growthEnd+ENDING.resultHold:ENDING.emptyReplayAt};
  }
  // Integrate a continuous trapezoidal velocity: 20% acceleration, 60% cruise,
  // 20% deceleration. No individual plant event changes this one-shot path.
  function cameraProgress(time) {
    const p=clamp(time,0,1),a=ENDING.cameraAcceleration,v=1/(1-a);
    if(p<a)return v*p*p/(2*a);
    if(p>1-a)return 1-v*(1-p)*(1-p)/(2*a);
    return v*(p-a/2);
  }
  function returnZoom(s) { return s.titleCycle&&s.ending&&s.ending.focus?smooth((s.ending.elapsed-endingTiming(s).titleZoomAt)/ENDING.zoomDuration):0; }
  function titleMix(s) {
    if(!s.titleCycle||!s.ending)return 0;
    if(!s.ending.focus)return smooth((s.ending.elapsed-ENDING.emptyReplayAt)/ENDING.emptyDuration);
    return smooth((s.ending.elapsed-endingTiming(s).titleZoomAt-ENDING.zoomDuration+ENDING.connectDuration)/ENDING.connectDuration);
  }
  function growthOrder(s) {
    if(!s.result)return [];
    return s.result.arrivals.slice().sort((a,b)=>plantPose(s,a).x-plantPose(s,b).x||a.id-b.id);
  }
  // The leading pumpkin is the rightmost drawn fruit, with growthOrder's ID
  // tie-break. This same subject carries the result into the original title.
  function heroPumpkin(s) { return growthOrder(s).at(-1)||null; }
  function endingFrame(s) {
    const poses=growthOrder(s).map(a=>plantPose(s,a)), from=s.ending.from;
    if(poses.length<2&&!s.ending.returning)return {...from}; // A visible lone result needs no survey pan.
    const hero=poses.at(-1), pad=ENDING.framePadding;
    const left=Math.min(...poses.map(p=>p.x-22*p.size*(1+FRUIT.heroOvershoot)));
    const top=Math.min(...poses.map(p=>p.y-32*p.size*(1+FRUIT.heroOvershoot)));
    const bottom=Math.max(...poses.map(p=>s.geometry.floor(p.x).y+24));
    // Place the hero to the right of centre and reserve room for every fruit,
    // including sparse Builder rows. Framing responds to bounds, not events.
    const z=Math.min(ENDING.closeZoom,(ENDING.heroScreenX-pad)/(hero.x-left),
      (390-pad-ENDING.heroScreenX)/(22*hero.size*(1+FRUIT.heroOvershoot)),500/(bottom-top));
    return {x:hero.x-(ENDING.heroScreenX-195)/z,y:(top+bottom)/2-62,z};
  }
  // Only a resolved, offscreen result needs a separate return. Living stragglers
  // keep the existing gameplay camera and unlimited opportunity to arrive.
  function prepareReturn(s) {
    const first=growthOrder(s)[0];
    if(!first)return;
    const visible=growthOrder(s).some(a=>{
      const p=plantPose(s,a),q=screenPoint(s,p.x,p.y);
      return q.x>=10&&q.x<=380&&q.y>=30&&q.y<=710;
    });
    if(visible)return;
    const e=s.ending;
    e.returning={elapsed:0}; // Also opts the single-fruit frame into real framing.
    const target=endingFrame(s);
    // Leave a small continuous glide for the existing leaf-to-fruit shot.
    if(s.result.arrivals.length>1)target.x-=12/target.z;
    const from={...s.camera},distance=Math.hypot(target.x-from.x,target.y-from.y);
    const overview=Math.min(from.z,target.z,1.05);
    const wide=distance*Math.max(from.z,target.z)>640;
    const travelDuration=Math.max(2.4,distance*overview*1.25/800);
    Object.assign(e.returning,{from,target,overview,wide,travelDuration,duration:wide?travelDuration+1.8:2.4});
    e.phase='returning';
    arrivalTail.delete(s);
  }
  function returnCamera(s,dt) {
    const e=s.ending,r=e.returning;
    r.elapsed=Math.min(r.duration,r.elapsed+dt);
    const mix=(a,b,t)=>a+(b-a)*smooth(t);
    const zoom=(a,b,t)=>Math.exp(mix(Math.log(a),Math.log(b),t));
    if(r.wide) {
      // Keep the terrain at a readable scale. Distance sets duration, not an
      // arbitrary rush deadline: at most 800 logical px/s, zero endpoint speed.
      const travel=cameraProgress((r.elapsed-.9)/r.travelDuration);
      s.camera.x=r.from.x+(r.target.x-r.from.x)*travel;
      s.camera.y=r.from.y+(r.target.y-r.from.y)*travel;
      s.camera.z=r.elapsed<.9?zoom(r.from.z,r.overview,r.elapsed/.9):
        r.elapsed<.9+r.travelDuration?r.overview:zoom(r.overview,r.target.z,(r.elapsed-.9-r.travelDuration)/.9);
    } else {
      const t=smooth(r.elapsed/r.duration);
      for(const k of ['x','y','z'])s.camera[k]=r.from[k]+(r.target[k]-r.from[k])*t;
    }
    if(r.elapsed>=r.duration) {
      s.camera={...r.target};e.from={...r.target};e.pose={x:0,y:0,ring:0};
      e.returning=null;e.phase='pullback';
    }
  }
  function plants(s) {
    if (!s.result) return [];
    return growthOrder(s).map((arrival,i)=>({arrival, age:s.ending.elapsed-ENDING.growAt-i*ENDING.stagger}));
  }
  function resolve(s) {
    if (s.result || travelling(s).length) return;
    const arrivals=Object.freeze(s.seeds.filter(p=>p.arrival).map(p=>p.arrival).sort((a,b)=>a.at-b.at||a.id-b.id));
    s.result=Object.freeze({arrivals,lost:s.seeds.filter(p=>p.lost).length,total:s.seeds.length,at:s.time});
    s.finished=true;
    const focus=heroPumpkin(s);
    s.ending={elapsed:0,focus,titleReady:false,phase:arrivals.length?'pullback':'empty',growthComplete:!arrivals.length,
      from:{...s.camera},pose:{x:s.x,y:s.y,ring:s.ring}};
    const motion=cameraMotion.get(s);
    if(arrivals.length&&motion?.travelled) {
      const z=Math.max(.1,s.camera.z);
      arrivalTail.set(s,{vx:clamp(motion.vx,-60/z,60/z),vy:clamp(motion.vy,-18/z,18/z)});
    }
    prepareReturn(s);
    release(s); // Release only input; preserve physical pose/camera for the pullback.
  }
  function support(p, nx, ny) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    return Math.hypot(10.3 * (nx * c + ny * s), 5.5 * (-nx * s + ny * c));
  }
  function create(source = D.create(), transitioning = false, stage = geometry) {
    const {START}=stage;
    const s = { geometry:stage, time: source.time, accumulator: source.accumulator, held: source.held, activeId: source.activeId,
      x: source.x, y: source.y, vx: source.vx, vy: source.vy,
      targetX: source.targetX, targetY: source.targetY, anchorX: source.anchorX, anchorY: source.anchorY,
      ring: source.ring, ringV: source.ringV, contacts: [], marks: [], impactCount: source.impactCount,
      camera: { x: START.x, y: START.y, z: transitioning ? 1 : ZOOM }, cameraLead: 0,
      transition: transitioning ? { elapsed: 0, progress: 0, settled: false } : null,
      gestureAssist:{armed:true,peakY:0,lastX:0,lastY:0,side:0,down:0,direction:0}, finished: false, replayReady:false, result:null, ending:null, arrivals:[], arrivalEvents:[], farm:farm(stage), seeds: source.seeds };
    // Stage 0 draws positions with y * .8, but rotates the grain in screen space.
    // Bake that projection into y and vy, keeping angle/spin/x/vx unchanged.
    // The matching camera transform makes transfer pixel-continuous (tested).
    for (const [i, p] of s.seeds.entries()) {
      p.x += START.x; p.y = START.y + p.y * .8; p.vy *= .8; p.attached = false;
      p.lost = false; p.inactive = false; p.fallTime = 0; p.arrival=null; p.soilTime=0; p.runId=i;
      p.dragFactor = .98 + i % 4 * .014; p.turn = p.angle; p.roll = p.roll || 1;
      p.assist={at:-Infinity,speed:0,used:false,groundTime:0,count:0,lastLift:0};
      p.jump=jumpRecord(); // Fresh run, including Builder TEST START/RESET. Never serialized.
      // Presentation only: one first-floor landing on the title-to-stage fall.
      p.entryLandingUntil=transitioning?s.time+DURATION+.6:null;
      p.entryLandedAt=null;
    }
    return s;
  }
  function opening(s) { return s.transition ? smooth((s.transition.progress - .36) / .57) : 1; }
  function view(s) {
    const o = opening(s), z = s.camera.z;
    const ease=s.ending ? 1-smooth(s.ending.returning?s.ending.returning.elapsed/s.ending.returning.duration:s.ending.elapsed/2.8) : 1;
    const x=s.ending?s.ending.pose.x:s.x, y=s.ending?s.ending.pose.y:s.y, ring=s.ending?s.ending.pose.ring:s.ring;
    return { x: 195 + x * (34 - 22 * o)*ease, y: 365 + y * (23 - 15 * o)*ease,
      angle: x * (.22 - .15 * o)*ease, sx: z * (1 + ring * .22*ease),
      sy: z * (1 - y * .15*ease - ring * .18*ease) };
  }
  function screenPoint(s, x, y) {
    const v = view(s), dx = (x - s.camera.x) * v.sx, dy = (y - s.camera.y) * v.sy;
    return { x: v.x + Math.cos(v.angle) * dx - Math.sin(v.angle) * dy,
      y: v.y + Math.sin(v.angle) * dx + Math.cos(v.angle) * dy };
  }
  function point(s, x, y) {
    const v = view(s), dx = x - v.x, dy = y - v.y;
    return { x: (Math.cos(v.angle) * dx + Math.sin(v.angle) * dy) / v.sx + s.camera.x,
      y: (-Math.sin(v.angle) * dx + Math.cos(v.angle) * dy) / v.sy + s.camera.y };
  }
  function release(s) { s.held = false; s.activeId = null; s.targetX = s.targetY = 0; beginDrag(s); }
  function contact(s, p, speed, material) {
    if (speed < 17 || p.cool > 0) return;
    p.cool = .09; s.impactCount++; s.contacts.push({ x: p.x, y: p.y, speed, material });
  }
  function knock(s, x, y) {
    if(s.result)return;
    s.ringV += .45;
    // Physical world impulse must not depend on render-rate camera smoothing.
    const active = travelling(s);
    if (!active.length) return;
    const centreX = active.reduce((n,p) => n+p.x,0) / active.length;
    const centreY = active.reduce((n,p) => n+p.y,0) / active.length;
    s.vx += clamp((x - centreX) / 110, -1, 1) * .09;
    s.vy += clamp((y - centreY) / 110, -1, 1) * .09;
    for (const p of active) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const force = 58 * Math.exp(-d / 170); p.vx += dx / d * force; p.vy += dy / d * force;
    }
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
  function step(s, dt) {
    const {START,END,floor}=s.geometry;
    s.time += dt;
    if(s.result) {
      const e=s.ending,timing=endingTiming(s);
      if(!e.returning) { // No offscreen growth/title clock; lost grains still fall.
        e.elapsed+=dt;
        e.growthComplete=!s.result.arrivals.length || e.elapsed>=timing.growthEnd;
        e.titleReady=!!s.titleCycle&&e.elapsed>=(e.focus?timing.titleZoomAt+ENDING.zoomDuration:ENDING.emptyReplayAt+ENDING.emptyDuration);
        e.phase=e.titleReady?'title':titleMix(s)>0?'connecting':!e.focus?'empty':s.titleCycle&&e.elapsed>=timing.titleZoomAt?'zoom':e.growthComplete?'rest':e.elapsed<ENDING.growAt?'pullback':'growing';
        s.replayReady=e.elapsed>=(s.result.arrivals.length?ENDING.replayAt:ENDING.emptyReplayAt);
      }
      release(s);
      // The same short visible fall still completes after an all-lost result.
      for(const p of s.seeds)if(p.lost&&!p.inactive) {
        p.fallTime+=dt;p.vy+=360*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
        if(p.y>s.geometry.bounds.lostY+400||p.fallTime>2)p.inactive=true;
      }
      return;
    }
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
    if(o===1&&(!s.transition||s.transition.settled))for(const p of travelling(s)) {
      const a=p.assist,f=floor(p.x);
      const feature=s.geometry.featureContacts(p,support).find(h=>h.ny<-.5&&Math.abs(h.penetration)<=ASSIST.contactSlop);
      const surface=feature||(f&&p.y<f.y&&f.ny<-.5&&Math.abs((p.y-f.y)*-f.ny+support(p,f.nx,f.ny))<=ASSIST.contactSlop?f:null);
      if(surface) {
        a.groundTime+=dt;
        // A stable landing rearms this grain; tiny launch-contact jitter does not.
        if(a.groundTime>=ASSIST.landTime)a.used=false;
        if(!a.used){a.at=s.time;a.speed=p.vx*-surface.ny+p.vy*surface.nx;}
      } else a.groundTime=0;
    }
    // Observe the final physical contact before END can freeze velocity/results.
    // OFF is a diagnostic comparison switch only; no physics reads this state.
    if(o===1&&(!s.transition||s.transition.settled)&&s.observeJumps!==false)
      for(const p of s.seeds)if(!p.arrival)observeJump(p.jump,p,terrainContact(s,p),dt);
    if(o===1) for(const p of travelling(s)) {
      const f=floor(p.x), onSoil=p.x>=END.left&&p.x<=END.right&&f&&p.y<f.y;
      const gap=onSoil ? (p.y-f.y)*-f.ny+support(p,f.nx,f.ny) : Infinity;
      // Actual one-sided top contact, not x-range, air passage or an underside.
      p.soilTime=onSoil&&Math.abs(gap)<1.2&&Math.hypot(p.vx,p.vy)<95 ? p.soilTime+dt : 0;
      if(p.soilTime>=.24) {
        const bestJump=p.jump.best;
        const arrival=Object.freeze({seed:p,id:p.runId,at:s.time,x:p.x,y:p.y,rootY:f.y,angle:p.angle,roll:p.roll,bestJump,reward:jumpAmount(bestJump)});
        p.arrival=arrival;p.vx=p.vy=p.spin=0;
        s.arrivals.push(arrival);s.arrivalEvents.push(arrival);
      }
    }
    if(o===1)resolve(s);
  }
  function camera(s, dt) {
    const {START}=s.geometry;
    if(s.result) {
      if(s.ending.returning) { returnCamera(s,dt);return; }
      if(s.result.arrivals.length) {
        const frame=endingFrame(s);
        const {cameraStart,growthEnd}=endingTiming(s);
        // Hold the gameplay view until leaves open. Cruise through the fruit
        // onsets, then land with growth completion and hold the whole result.
        const time=clamp((s.ending.elapsed-cameraStart)/(growthEnd-cameraStart),0,1);
        const glide=cameraProgress(time);
        const a=s.ending.from;
        for(const k of ['x','y','z'])s.camera[k]=time===1?frame[k]:a[k]+(frame[k]-a[k])*glide;
        const zoom=returnZoom(s),p=plantPose(s,s.ending.focus);
        // Match the original title's 143px shell at the end of this same move.
        const target={x:p.x,y:p.y,z:143/(20*p.size)};
        for(const k of ['x','y','z'])s.camera[k]+=(target[k]-s.camera[k])*zoom;
        let tail=arrivalTail.get(s);
        const t=s.ending.elapsed;
        // Re-evaluating the initial ending pose (preview/reset), or rewinding
        // its clock, must not replay motion sampled from a previous view.
        if(tail&&(t<(tail.elapsed||0)||dt===0&&t===0)) {
          arrivalTail.delete(s);tail=null;
        }
        if(tail&&t<.45) {
          tail.elapsed=t;
          // Continue the incoming motion, then softly settle back into the
          // unchanged shot anchor. Peak travel is under 3 logical pixels.
          const carry=t*Math.pow(1-t/.45,3);
          s.camera.x+=tail.vx*carry;s.camera.y+=tail.vy*carry;
        } else if(tail)arrivalTail.delete(s);
      }
      return;
    }
    const active = travelling(s);
    if (!active.length) return; // Hold the last view during the quiet replay pause.
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
  function update(s, elapsed) {
    s.contacts.length = 0; s.arrivalEvents.length=0; s.accumulator += clamp(elapsed, 0, .06);
    const dt=clamp(elapsed,0,.06),before={x:s.camera.x,y:s.camera.y};
    const motion=cameraMotion.get(s),travelled=!!motion?.travelled||travelling(s).some(p=>Math.abs(p.vx)>18);
    while (s.accumulator >= T.step) { step(s, T.step); s.accumulator -= T.step; }
    camera(s, dt);
    if(!s.result&&dt>0)cameraMotion.set(s,{vx:(s.camera.x-before.x)/dt,vy:(s.camera.y-before.y)/dt,travelled});
  }
  const api = Object.freeze({ create, release, beginDrag, drag, ASSIST, knock, update, point, screenPoint, view, field, floor,
    support, geometry, terrain, segments, GAP, party, travelling, farm, plants, plantPose, fruitGrowth, FRUIT, growthOrder, heroPumpkin, endingFrame, endingTiming, cameraProgress, returnZoom, titleMix, jump, ENDING, CONTROL, ROUND, START, END, opening, smooth, DURATION, ZOOM });
  root.PumpkinJourney = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
