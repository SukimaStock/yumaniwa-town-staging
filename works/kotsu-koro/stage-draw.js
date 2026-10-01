(function (root) {
  'use strict';
  const J = root.PumpkinJourney, TAU = Math.PI * 2;
  function region(c, g, extra, fill) {
    c.fillStyle = fill; c.strokeStyle = fill; c.lineWidth = (g.r + extra) * 2; c.lineCap = 'round';
    c.beginPath();
    if (g.kind === 'bowl') { c.arc(g.x, g.y, g.r + extra, 0, TAU); c.fill(); }
    else { c.moveTo(g.ax, g.ay); c.lineTo(g.bx, g.by); c.stroke(); }
  }
  function draw(c, s, seed, opening = 1) {
    c.save(); c.translate(195 + s.x * 14, 365 + s.y * 9); c.rotate(s.x * .12);
    c.scale(s.camera.z, s.camera.z * .8); c.translate(-s.camera.x, -s.camera.y);
    // The lip, flesh and playable surface follow the same connected geometry.
    for (const g of J.geometry) region(c, g, 39, '#3b5742');
    for (const g of J.geometry) region(c, g, 35, '#e6a849');
    for (const g of J.geometry) region(c, g, 28, '#f1ba60');
    for (const g of J.geometry) region(c, g, 0, '#c78842');
    for (const g of J.bowls) {
      const light = c.createRadialGradient(g.x - 15, g.y - 22, 0, g.x, g.y, g.r);
      light.addColorStop(0, g.material === 'rest' ? '#efd3a0' : '#d89b51');
      light.addColorStop(.65, g.material === 'rest' ? '#dfb974' : '#c88940');
      light.addColorStop(1, '#9b612d');
      region(c, g, 0, light);
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU, r = g.r + 8;
        c.beginPath(); c.moveTo(g.x + Math.cos(a) * r, g.y + Math.sin(a) * r);
        c.quadraticCurveTo(g.x + Math.cos(a + .045) * (r + 10), g.y + Math.sin(a + .045) * (r + 10), g.x + Math.cos(a + .02) * (r + 23), g.y + Math.sin(a + .02) * (r + 23));
        c.strokeStyle = 'rgba(255,229,167,.4)'; c.lineWidth = 1.1; c.stroke();
      }
    }
    // Wet lanes have a slightly pale, slick centre. No moving decoration.
    for (const g of J.geometry.filter(g => g.kind === 'lane' && g.material === 'wet')) {
      c.beginPath(); c.moveTo(g.ax, g.ay); c.lineTo(g.bx, g.by);
      c.strokeStyle = 'rgba(251,211,136,.25)'; c.lineWidth = 28; c.stroke();
      c.strokeStyle = 'rgba(255,243,195,.25)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(g.ax - 11, g.ay); c.lineTo(g.bx - 11, g.by); c.stroke();
    }
    for (const m of s.marks) {
      c.beginPath(); c.moveTo(m.ox, m.oy); c.lineTo(m.x, m.y);
      c.strokeStyle = `rgba(255,231,172,${.2 * Math.pow(1 - m.age / 12, 2)})`; c.lineWidth = 1.2; c.stroke();
    }
    for (const f of s.fibres) {
      c.beginPath(); c.moveTo(f.ax, f.ay);
      c.quadraticCurveTo((f.ax + f.bx) / 2, (f.ay + f.by) / 2 + f.bend, f.bx, f.by);
      c.strokeStyle = 'rgba(126,82,36,.2)'; c.lineWidth = 5; c.stroke();
      c.strokeStyle = '#efd295'; c.lineWidth = 2; c.stroke();
    }
    for (const [i, p] of s.seeds.entries()) seed(c, p, i, 1);
    c.restore();
  }
  root.PumpkinStageDraw = { draw };
})(window);
