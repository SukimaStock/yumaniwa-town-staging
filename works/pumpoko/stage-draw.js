(function (root) {
  'use strict';
  const J = root.PumpkinJourney || require('./journey.js');
  const ease=J.smooth, TAU=Math.PI*2;
  function transform(c, s) {
    const v = J.view(s);
    c.translate(v.x, v.y); c.rotate(v.angle); c.scale(v.sx, v.sy);
    c.translate(-s.camera.x, -s.camera.y);
  }
  function surface(c, samples, lift = 0, bottom = 1100) {
    c.beginPath(); c.moveTo(samples[0].x, bottom);
    for (const p of samples) c.lineTo(p.x, p.y + lift);
    c.lineTo(samples.at(-1).x, bottom); c.closePath();
  }
  function drawTerrain(c,g,lift=0,wallAlpha=1) {
    const bottom=Math.max(1100,g.bounds.lostY+500);
      for (const segment of g.segments) {
        const samples = segment.samples;
        c.save();
        surface(c,samples,lift,bottom);
        const ground = c.createLinearGradient(0,330+lift,0,750+lift);
        ground.addColorStop(0,'#f4c16c'); ground.addColorStop(.55,'#e5a448'); ground.addColorStop(1,'#ce8c3c');
        c.fillStyle=ground; c.fill();
        c.save(); surface(c,samples,lift,bottom); c.clip();
        c.beginPath(); for(const [i,p] of samples.entries()) { if(!i)c.moveTo(p.x,p.y+lift+21);else c.lineTo(p.x,p.y+lift+21); }
        c.strokeStyle='#f9d791'; c.lineWidth=35; c.stroke();
        c.beginPath(); for(const [i,p] of samples.entries()) { if(!i)c.moveTo(p.x,p.y+lift+76);else c.lineTo(p.x,p.y+lift+76); }
        c.strokeStyle='rgba(204,135,53,.16)'; c.lineWidth=16; c.stroke();
        c.restore();
        // The top line uses the exact sampled collision surface, including walls.
        c.lineCap='round'; c.lineJoin='round';
        c.beginPath();
        for(const [i,p] of samples.entries()) { if(!i)c.moveTo(p.x,p.y+lift);else c.lineTo(p.x,p.y+lift); }
        // Visible cut sides bound the same platforms as collision; no bridge.
        c.moveTo(samples[0].x,bottom);c.lineTo(samples[0].x,samples[0].y+lift);
        c.moveTo(samples.at(-1).x,samples.at(-1).y+lift);c.lineTo(samples.at(-1).x,bottom);
        c.strokeStyle='#647454'; c.lineWidth=7; c.stroke();
        c.beginPath(); for(const [i,p] of samples.entries()) { if(!i)c.moveTo(p.x,p.y+lift+5);else c.lineTo(p.x,p.y+lift+5); }
        c.strokeStyle='#fff0b8'; c.lineWidth=3; c.stroke();
        for(const kind of ['cushion','polished']) {
          c.beginPath();let pen=false;
          for(const p of samples) {
            if(p.material===kind) { if(!pen)c.moveTo(p.x,p.y+lift+1);else c.lineTo(p.x,p.y+lift+1);pen=true; }
            else pen=false;
          }
          c.strokeStyle=kind==='cushion'?'#fff0c7':'#ffdf96'; c.lineWidth=kind==='cushion'?10:6;c.stroke();
        }
        c.restore();
      }
      c.save();c.globalAlpha*=wallAlpha;
      // Only the two outside walls remain; each gap stays open below its lips.
      c.beginPath();c.moveTo(g.bounds.left,-200);c.lineTo(g.bounds.left,(g.floor(g.bounds.left)?.y||350)+lift);
      c.moveTo(g.bounds.right,(g.floor(g.bounds.right)?.y||350)+lift);c.lineTo(g.bounds.right,-200);
      c.strokeStyle='#647454';c.lineWidth=7;c.stroke();c.restore();
  }
  function drawLoops(c,g) {
    for(const f of g.loops){
      const a=Math.PI/2+f.mouth,b=Math.PI/2-f.mouth+Math.PI*2;
      c.save();c.lineCap='round';
      c.beginPath();c.arc(f.x,f.y,f.radius+13,a,b);c.strokeStyle='#e8ad53';c.lineWidth=26;c.stroke();
      c.beginPath();c.arc(f.x,f.y,f.radius+5,a,b);c.strokeStyle='#fff0b8';c.lineWidth=6;c.stroke();
      c.beginPath();c.arc(f.x,f.y,f.radius,a,b);c.strokeStyle='#647454';c.lineWidth=7;c.stroke();
      for(const ramp of f.ramps){const path=(offset)=>{c.beginPath();for(const [i,p]of ramp.entries()){if(i)c.lineTo(p.x,p.y+offset);else c.moveTo(p.x,p.y+offset);}};
      path(8);c.strokeStyle='#e8ad53';c.lineWidth=16;c.stroke();path(4);c.strokeStyle='#fff0b8';c.lineWidth=5;c.stroke();path(0);c.strokeStyle='#647454';c.lineWidth=7;c.stroke();}
      c.restore();
    }
  }
  function drawFarm(c,g,lift=0,settled=false) {
    const f=J.farm(g), ps=f.samples;
    c.save();c.lineCap='round';c.lineJoin='round';
    if(!settled) {
      // During play, a quiet light edge is enough to hint that the shallow
      // hollow can receive the travelling seeds. The terrain remains the body.
      c.beginPath();for(const [i,p]of ps.entries()){if(i)c.lineTo(p.x,p.y+lift+5);else c.moveTo(p.x,p.y+lift+5);}
      c.strokeStyle='#e1c596';c.lineWidth=14;c.stroke();
    } else {
      // The ending is still the same pumpkin-world stratum, not a new farm.
      // Keep only a restrained warm seam at the receiving hollow; plants root
      // on the unchanged sampled surface drawn by drawTerrain underneath.
      c.beginPath();for(const [i,p]of ps.entries()){if(i)c.lineTo(p.x,p.y+lift+6);else c.moveTo(p.x,p.y+lift+6);}
      c.strokeStyle='rgba(255,240,184,.48)';c.lineWidth=8;c.stroke();
    }
    c.restore();
  }
  function leaf(c,x,y,size,angle,color) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-7,-9,0,-17,10,-16);
    c.bezierCurveTo(24,-16,24,-3,14,1);c.bezierCurveTo(8,4,3,2,0,0);
    c.fillStyle=color;c.fill();c.restore();
  }
  function grassPoses(s,a) {
    const density=J.plantPose(s,a).density, g=s.geometry;
    // Stable slots: richness reveals existing places; it never relocates a tuft.
    return [-24,27,-38,40].map((offset,i)=> {
      const x=a.x+(offset+(a.id%3-1)*3)*density;
      const f=g.floor(x);
      return f&&x>g.END.left+3&&x<g.END.right-3?{x,y:f.y,angle:Math.atan2(f.nx,-f.ny),slot:i}:null;
    }).filter(Boolean);
  }
  function grass(c,x,y,size,angle) {
    c.save();c.translate(x,y+1);c.rotate(angle);
    const color=c.createLinearGradient(0,-12*size,0,2);
    color.addColorStop(0,'#a4b386');color.addColorStop(1,'#83976c');
    for(const [lean,scale] of [[-2.4,.40],[-1.5,.47],[-.6,.36]])
      leaf(c,0,0,size*scale,lean,color);
    c.restore();
  }
  function smoothGrass(reward,slot) { return ease((reward-(slot-1)*.22)/.45)*.78; }
  function fruit(c,x,y,size,id,zoom=0) {
    c.save();c.translate(x,y);c.rotate((id%3-1)*.045*(1-zoom));c.scale(size,size);
    c.fillStyle='rgba(93,68,32,.12)';c.beginPath();c.ellipse(1,13,16,3,0,0,TAU);c.fill();
    // A single plump silhouette, with broad lobes instead of outlined ribs.
    c.beginPath();c.moveTo(0,-12);
    c.bezierCurveTo(8,-18,20,-12,20,-1);c.bezierCurveTo(21,9,11,16,0,13);
    c.bezierCurveTo(-11,16,-21,9,-20,-1);c.bezierCurveTo(-20,-12,-8,-18,0,-12);c.closePath();
    const body=c.createLinearGradient(-12,-14,12,15);
    body.addColorStop(0,'#ffc574');body.addColorStop(.55,'#f5ac56');body.addColorStop(1,'#e59445');
    c.fillStyle=body;c.fill();c.save();c.clip();
    c.beginPath();c.ellipse(-10,0,9,15,-.10,0,TAU);c.fillStyle='rgba(255,215,142,.30)';c.fill();
    c.beginPath();c.ellipse(2,1,9,15,0,0,TAU);c.fillStyle='rgba(255,198,112,.38)';c.fill();
    c.restore();
    c.beginPath();c.moveTo(-2,-12);c.quadraticCurveTo(-4,-18,1+id%2,-20);
    c.strokeStyle='#698253';c.lineWidth=4.5;c.lineCap='round';c.stroke();
    c.beginPath();c.ellipse(-6,-7,3.8,2.2,-.45,0,TAU);c.fillStyle='rgba(255,233,183,.48)';c.fill();c.restore();
  }
  function drawPlants(c,s,returnShell) {
    const mix=J.titleMix(s),zoom=J.returnZoom(s);
    const ps=J.plants(s).slice().sort((a,b)=>a.arrival.rootY-b.arrival.rootY||a.arrival.id-b.arrival.id);
    for(const {arrival:a,age} of ps) {
      if(age<=0)continue;
      const sprout=ease(age/.65), leaves=ease((age-.5)/.85), grow=ease((age-1.4)/.95);
      const p=J.plantPose(s,a), density=p.density, reward=p.reward, dx=p.x-a.x, dy=p.y-a.rootY, focused=a===s.ending.focus;
      c.save();c.translate(a.x,a.rootY);
      c.save();c.globalAlpha*=(1-mix)*(focused?1:1-ease((zoom-.45)/.5));
      for(const tuft of grassPoses(s,a)) {
        const amount=tuft.slot===0?.48:smoothGrass(reward,tuft.slot);
        if(amount<=0)continue;
        c.save();c.globalAlpha*=amount*leaves;
        grass(c,tuft.x-a.x,tuft.y-a.rootY,density*(.65+.18*reward),tuft.angle);c.restore();
      }
      // A small upright shoot relaxes into a low sideways vine, never a pedestal.
      c.beginPath();c.moveTo(0,1);
      c.quadraticCurveTo(-dx*.5,-10*sprout,dx*leaves,(dy+13*p.size)*leaves-2);
      c.strokeStyle='#607b4e';c.lineWidth=2+leaves*.8;c.lineCap='round';c.stroke();
      const sway=Math.sin(s.ending.elapsed*1.1+a.id*1.7)*.025*leaves;
      leaf(c,-4-8*reward,-5-2*reward,(.28*sprout+.40*leaves)*density*(1+.28*reward),-.5-.9*reward+sway,'#758f59');
      leaf(c,5+12*reward,-7,(.24*sprout+.38*leaves)*density*(1+.25*reward),-2.5+2.2*reward-sway,'#5f7d51');
      if(grow>0) {
        const settling=1+.055*Math.sin(Math.max(0,age-2.35)*9)*Math.exp(-Math.max(0,age-2.35)*3.5);
        // Bottom stays on the soil while the fruit swells, instead of lifting it.
        fruit(c,dx,dy+13*p.size*(1-grow*settling),grow*settling*p.size,a.id,focused?zoom:0);
      }
      c.restore();
      if(focused&&mix>0&&returnShell) {
        // Reveal the existing cut pumpkin at the very same fruit centre/scale.
        c.save();c.translate(dx,dy);c.scale(20*p.size/143,20*p.size/143);
        c.globalAlpha*=mix;returnShell(c);c.restore();
      }
      c.restore();
    }
  }
  function drawSeeds(c,s,seed) {
    for(const [i,p] of s.seeds.entries()) {
      if(p.inactive)continue;
      if(!p.arrival){seed(c,p,i,1);continue;}
      const a=p.arrival, plant=J.plants(s).find(v=>v.arrival===a), age=plant?plant.age:-1;
      if(age>=.6)continue;
      const local=Math.max(0,s.time-a.at), sink=ease(age/.6);
      c.save();c.globalAlpha=1-sink;
      seed(c,{...p,x:a.x,y:a.y+sink*6+Math.sin(local*12)*1.2*Math.exp(-local*6),angle:a.angle+Math.sin(local*9)*.10*Math.exp(-local*5)},i,1);
      c.restore();
    }
  }
  function draw(c, s, seed, shell, returnShell) {
    const mix=J.titleMix(s);
    const rest=s.ending?ease(s.ending.elapsed/2.8):0;
    const o = J.opening(s), g = s.geometry || J.geometry;
    // The tabletop opens into cream space as the same cut surface fills the view.
    c.save(); c.globalAlpha = o*(1-mix);
    const sky = c.createLinearGradient(0, 0, 0, 740);
    sky.addColorStop(0, '#faf2d5'); sky.addColorStop(.58, '#fff3cf'); sky.addColorStop(1, '#efd8a4');
    c.fillStyle = sky; c.fillRect(0, 0, 390, 740);
    // Broad distant curves, separated from the foreground; no hollow or tube.
    c.fillStyle = '#d8dec0';
    c.beginPath(); c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10) c.lineTo(x, 475-220*rest + Math.sin((x+s.camera.x*.16)/260)*52);
    c.lineTo(490,740); c.closePath(); c.fill();
    c.fillStyle = '#ecd5a0';
    c.beginPath(); c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10) c.lineTo(x, 560-215*rest + Math.sin((x+s.camera.x*.28)/210+.8)*34);
    c.lineTo(490,740); c.closePath(); c.fill(); c.restore();
    c.save(); transform(c,s);
    if (s.transition && o < .7 && shell) {
      c.save(); c.translate(g.START.x,g.START.y);
      // The curved cut unrolls into a huge landscape. Both visible rim and
      // collision expand; the grains themselves are never rescaled/replaced.
      c.scale(1 + o * 1150 / 94, 1 + o * 1150 / 94);
      c.globalAlpha = 1 - J.smooth((o - .20) / .5); shell(c); c.restore();
    }
    if (o > 0) {
      const lift = (1-o)*700;
      c.save(); c.globalAlpha = J.smooth(o*2)*(1-mix);
      // The journey and nursery remain one continuous piece of land. A result
      // changes what grows here, not whether the Stage 1 ground still exists.
      const settled=!!(s.result&&s.ending&&s.result.arrivals.length);
      drawTerrain(c,g,lift);
      drawLoops(c,g);
      drawFarm(c,g,lift,settled);
      c.restore();
    }
    // Draw exactly one copy of each object over the changing world.
    c.save();c.globalAlpha*=1-mix;drawSeeds(c,s,seed);c.restore();
    drawPlants(c,s,returnShell);
    c.restore();
  }
  const api={ draw, drawTerrain, drawLoops, drawFarm, drawPlants, drawSeeds, grassPoses };
  root.PumpkinStageDraw=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
