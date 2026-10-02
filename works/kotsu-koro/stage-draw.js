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
  function drawTerrain(c,g,lift=0) {
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
      // Only the two outside walls remain; each gap stays open below its lips.
      c.beginPath();c.moveTo(g.bounds.left,-200);c.lineTo(g.bounds.left,(g.floor(g.bounds.left)?.y||350)+lift);
      c.moveTo(g.bounds.right,(g.floor(g.bounds.right)?.y||350)+lift);c.lineTo(g.bounds.right,-200);
      c.strokeStyle='#647454';c.lineWidth=7;c.stroke();
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
  function drawFarm(c,g,lift=0) {
    const f=J.farm(g), ps=f.samples;
    c.save();c.beginPath();c.moveTo(f.left,ps[0].y+lift);
    for(const p of ps)c.lineTo(p.x,p.y+lift);
    c.lineTo(f.right,ps.at(-1).y+lift+60);
    for(const p of ps.slice().reverse())c.lineTo(p.x,p.y+lift+60);
    c.closePath();
    const soil=c.createLinearGradient(0,Math.min(...ps.map(p=>p.y))+lift,0,Math.max(...ps.map(p=>p.y))+lift+75);
    soil.addColorStop(0,'#b99465');soil.addColorStop(.6,'#ceb080');soil.addColorStop(1,'#ddc598');
    c.fillStyle=soil;c.fill();c.clip();
    c.lineCap='round';c.lineJoin='round';
    for(const depth of [2,19,41,58]) {
      c.beginPath();for(const [i,p]of ps.entries()) {if(i)c.lineTo(p.x,p.y+lift+depth);else c.moveTo(p.x,p.y+lift+depth);}
      c.strokeStyle=depth===2?'#d3b17c':depth===58?'rgba(238,213,166,.6)':'rgba(147,109,64,.23)';
      c.lineWidth=depth===2?9:4;c.stroke();
    }
    for(let i=0;i<38;i++) {const x=f.left+(f.right-f.left)*(i+.5)/38,y=g.floor(x).y+lift+8+i%4*11;
      c.fillStyle=i%2?'rgba(249,230,187,.38)':'rgba(124,93,55,.20)';c.beginPath();c.ellipse(x,y,1.4+i%3*.4,.7,0,0,TAU);c.fill();}
    c.restore();
  }
  function leaf(c,x,y,size,angle,color) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-3,-14,12,-19,21,-12);c.bezierCurveTo(19,-1,7,4,0,0);
    c.fillStyle=color;c.fill();c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(9,-6,17,-10);c.strokeStyle='rgba(218,224,156,.50)';c.lineWidth=1;c.stroke();c.restore();
  }
  function fruit(c,x,y,size,id) {
    c.save();c.translate(x,y);c.scale(size,size);
    c.fillStyle='rgba(93,68,32,.13)';c.beginPath();c.ellipse(1,13,16,3,0,0,TAU);c.fill();
    c.lineWidth=1.2;c.strokeStyle='#bf803a';
    for(const [offset,width,color] of [[-9,8,'#eda04a'],[9,8,'#e89744'],[-4,10,'#f6af54'],[4,10,'#f2a44a'],[0,8,'#ffbb63']]) {
      c.beginPath();c.ellipse(offset,0,width,13.5,offset*.017,0,TAU);c.fillStyle=color;c.fill();c.stroke();
    }
    c.beginPath();c.moveTo(-3,-12);c.quadraticCurveTo(-2,-18,2+id%2,-20);c.lineTo(5,-18);c.quadraticCurveTo(1,-16,2,-12);
    c.closePath();c.fillStyle='#58734c';c.fill();
    c.beginPath();c.ellipse(-5,-5,2,4,-.35,0,TAU);c.fillStyle='rgba(255,226,151,.72)';c.fill();c.restore();
  }
  function drawPlants(c,s) {
    // Each stable arrival produces one stem and exactly one fruit. Fruit/leaf
    // pose varies by seed ID, while every stem begins at the recorded soil root.
    const ps=J.plants(s).slice().sort((a,b)=>a.arrival.rootY-b.arrival.rootY||a.arrival.id-b.arrival.id);
    for(const {arrival:a,age} of ps) {
      if(age<=0)continue;
      const sprout=ease(age/.65), leaves=ease((age-.5)/.85), grow=ease((age-1.4)/.95);
      const height=12*sprout+(21+Math.floor(a.id/3)*22)*leaves, dx=(a.id%3-1)*24*leaves;
      const sway=Math.sin(s.ending.elapsed*1.1+a.id*1.7)*.045*leaves;
      c.save();c.translate(a.x,a.rootY);c.rotate(sway);
      c.beginPath();c.moveTo(0,1);c.quadraticCurveTo(-dx*.3,-height*.65,dx,-height);
      c.strokeStyle='#607b4e';c.lineWidth=2+leaves*1.2;c.lineCap='round';c.stroke();
      leaf(c,-1,-height*.50,.34*sprout+.5*leaves,-.35+sway,'#758f59');
      leaf(c,1,-height*.63,.28*sprout+.52*leaves,-2.5-sway,'#5f7d51');
      if(grow>0) {
        const settling=1+.065*Math.sin(Math.max(0,age-2.35)*9)*Math.exp(-Math.max(0,age-2.35)*3.5);
        fruit(c,dx,-height+3,grow*settling*(.95+a.id%3*.025),a.id);
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
  function draw(c, s, seed, shell) {
    const o = J.opening(s), g = s.geometry || J.geometry;
    // The tabletop opens into cream space as the same cut surface fills the view.
    c.save(); c.globalAlpha = o;
    const sky = c.createLinearGradient(0, 0, 0, 740);
    sky.addColorStop(0, '#faf2d5'); sky.addColorStop(.58, '#fff3cf'); sky.addColorStop(1, '#efd8a4');
    c.fillStyle = sky; c.fillRect(0, 0, 390, 740);
    // Broad distant curves, separated from the foreground; no hollow or tube.
    c.fillStyle = '#d8dec0';
    c.beginPath(); c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10) c.lineTo(x, 475 + Math.sin((x+s.camera.x*.16)/260)*52);
    c.lineTo(490,740); c.closePath(); c.fill();
    c.fillStyle = '#ecd5a0';
    c.beginPath(); c.moveTo(-100,740);
    for(let x=-100;x<=490;x+=10) c.lineTo(x, 560 + Math.sin((x+s.camera.x*.28)/210+.8)*34);
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
      c.save(); c.globalAlpha = J.smooth(o*2);
      drawTerrain(c,g,lift);
      drawLoops(c,g);
      drawFarm(c,g,lift);
      c.restore();
    }
    // Draw exactly one copy of each object over the changing world.
    drawSeeds(c,s,seed);
    drawPlants(c,s);
    c.restore();
  }
  const api={ draw, drawTerrain, drawLoops, drawFarm, drawPlants, drawSeeds };
  root.PumpkinStageDraw=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
