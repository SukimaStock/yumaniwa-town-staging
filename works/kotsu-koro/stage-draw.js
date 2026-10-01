(function (root) {
  'use strict';
  const J = root.PumpkinJourney;
  function transform(c, s) {
    const v = J.view(s);
    c.translate(v.x, v.y); c.rotate(v.angle); c.scale(v.sx, v.sy);
    c.translate(-s.camera.x, -s.camera.y);
  }
  function surface(c, lift = 0) {
    c.beginPath(); c.moveTo(-50, 1100);
    for (const p of J.terrain) c.lineTo(p.x, p.y + lift);
    c.lineTo(2070, 1100); c.closePath();
  }
  function draw(c, s, seed, shell) {
    const o = J.opening(s);
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
      c.save(); c.translate(J.START.x,J.START.y);
      // The curved cut unrolls into a huge landscape. Both visible rim and
      // collision expand; the grains themselves are never rescaled/replaced.
      c.scale(1 + o * 1150 / 94, 1 + o * 1150 / 94);
      c.globalAlpha = 1 - J.smooth((o - .20) / .5); shell(c); c.restore();
    }
    if (o > 0) {
      const lift = (1-o)*700;
      c.save(); c.globalAlpha = J.smooth(o*2);
      surface(c,lift);
      const ground = c.createLinearGradient(0,330+lift,0,750+lift);
      ground.addColorStop(0,'#f4c16c'); ground.addColorStop(.55,'#e5a448'); ground.addColorStop(1,'#ce8c3c');
      c.fillStyle=ground; c.fill();
      c.save(); surface(c,lift); c.clip();
      c.beginPath(); for(const [i,p] of J.terrain.entries()) { if(!i)c.moveTo(p.x,p.y+lift+21);else c.lineTo(p.x,p.y+lift+21); }
      c.strokeStyle='#f9d791'; c.lineWidth=35; c.stroke();
      c.beginPath(); for(const [i,p] of J.terrain.entries()) { if(!i)c.moveTo(p.x,p.y+lift+76);else c.lineTo(p.x,p.y+lift+76); }
      c.strokeStyle='rgba(204,135,53,.16)'; c.lineWidth=16; c.stroke();
      c.restore();
      // The top line uses the exact sampled collision surface, including walls.
      c.lineCap='round'; c.lineJoin='round';
      c.beginPath(); c.moveTo(-40, -200); c.lineTo(-40,350+lift);
      for(const p of J.terrain) if(p.x>=-40&&p.x<=2060)c.lineTo(p.x,p.y+lift);
      c.lineTo(2060,-200);
      c.strokeStyle='#647454'; c.lineWidth=7; c.stroke();
      c.beginPath(); for(const [i,p] of J.terrain.entries()) { if(!i)c.moveTo(p.x,p.y+lift+5);else c.lineTo(p.x,p.y+lift+5); }
      c.strokeStyle='#fff0b8'; c.lineWidth=3; c.stroke();
      for(const kind of ['cushion','polished']) {
        c.beginPath();let pen=false;
        for(const p of J.terrain) {
          if(p.material===kind) { if(!pen)c.moveTo(p.x,p.y+lift+1);else c.lineTo(p.x,p.y+lift+1);pen=true; }
          else pen=false;
        }
        c.strokeStyle=kind==='cushion'?'#fff0c7':'#ffdf96'; c.lineWidth=kind==='cushion'?10:6;c.stroke();
      }
      c.restore();
    }
    // Draw exactly one copy of each object over the changing world.
    for(const [i,p] of s.seeds.entries())seed(c,p,i,1);
    c.restore();
  }
  root.PumpkinStageDraw = { draw };
})(window);
