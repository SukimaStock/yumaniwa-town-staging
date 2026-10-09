(function (root) {
  'use strict';
  const P = root.FruitLabPhysics;
  function ellipse(c, x, y, rx, ry, color) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  }
  function pumpkin(c, b) {
    c.save(); c.translate(b.x, b.y); c.rotate(-b.angle);
    const shade = c.createRadialGradient(-13, 15, 3, 4, -8, 52);
    shade.addColorStop(0, '#f9b244'); shade.addColorStop(.55, '#e98927'); shade.addColorStop(1, '#a84f1d');
    ellipse(c, 0, 0, 43, 33, shade);
    c.strokeStyle = '#a55a255c'; c.lineWidth = 1.5;
    for (const offset of [-26, -13, 0, 13, 26]) {
      c.beginPath(); c.moveTo(offset * .48, -30); c.bezierCurveTo(offset * 1.3 - 5, -12, offset * 1.3 - 5, 20, offset * .5, 31); c.stroke();
      c.strokeStyle = '#fff0ba3b'; c.beginPath(); c.moveTo(offset * .48 + 2, -28); c.bezierCurveTo(offset * 1.3 - 2, -10, offset * 1.3 - 2, 20, offset * .5 + 2, 28); c.stroke(); c.strokeStyle = '#a55a255c';
    }
    c.fillStyle = '#6b7144'; c.beginPath(); c.moveTo(-4, 29); c.lineTo(-3, 42); c.quadraticCurveTo(4, 45, 7, 39); c.lineTo(3, 29); c.fill();
    c.restore();
  }
  function rutabaga(c, b) {
    c.save(); c.translate(b.x, b.y);
    // Skin leans with spin; root/shoulder retain a recognisable vegetable shape.
    c.rotate(-b.angle * .7);
    c.scale(1 + b.pulse * .13 - b.stretch * .4, 1 - b.pulse * .13 + b.stretch);
    const outline = () => {
      c.beginPath(); c.moveTo(-4, 33); c.bezierCurveTo(-31, 36, -40, 18, -33, -3);
      c.bezierCurveTo(-32, -24, -15, -32, -3, -30); c.bezierCurveTo(17, -35, 31, -20, 34, -2);
      c.bezierCurveTo(38, 17, 20, 31, -4, 33); c.closePath();
    };
    const shade = c.createLinearGradient(-30, 35, 25, -32);
    shade.addColorStop(0, '#9d778e'); shade.addColorStop(.36, '#8a5b80');
    shade.addColorStop(.47, '#c4a4a4'); shade.addColorStop(.58, '#eee1b8'); shade.addColorStop(1, '#c1ad77');
    outline(); c.fillStyle = shade; c.fill();
    c.strokeStyle = '#71525b25'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#b29b6e'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -28); c.quadraticCurveTo(-7, -42, 2, -44); c.stroke();
    c.strokeStyle = '#547447'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 30); c.quadraticCurveTo(-7, 41, -1, 44); c.stroke();
    ellipse(c, 5, 40, 9, 3, '#728858');
    c.strokeStyle = '#fff7df55'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-23, 14); c.quadraticCurveTo(-27, 1, -18, -12); c.stroke();
    c.restore();
  }
  function drawBody(c, b, active) {
    const floor = P.terrain(b.x), altitude = Math.max(0, b.y - b.r - floor);
    ellipse(c, b.x, floor + 2, Math.max(12, b.r * (1 - altitude / 1000)), 5, `rgba(85,65,40,${.19 / (1 + altitude / 90)})`);
    (b.kind === 'pumpkin' ? pumpkin : rutabaga)(c, b);
    if (active) { ellipse(c, b.x, b.y + b.r + 26, 2.5, 2.5, '#88705780'); }
  }
  root.FruitLabDraw = function (c, s) {
    c.save(); c.translate(500 - s.camera.x, 64 - s.camera.y);
    c.beginPath(); c.moveTo(-510, 0);
    for (let x = -510; x <= 510; x += 5) c.lineTo(x, P.terrain(x));
    c.lineTo(510, 0); c.closePath();
    const ground = c.createLinearGradient(0, 0, 0, 420);
    ground.addColorStop(0, '#d8ba8b'); ground.addColorStop(1, '#e4ca9c');
    c.fillStyle = ground; c.fill();
    c.strokeStyle = '#a88b6235'; c.lineWidth = 1;
    for (const depth of [18, 34, 65, 110]) {
      c.beginPath();
      for (let x = -510; x <= 510; x += 10) { const y = P.terrain(x) - depth + Math.sin(x * .016 + depth) * 3; x === -510 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
    c.strokeStyle = '#fff5d6'; c.lineWidth = 5; c.beginPath();
    for (let x = -510; x <= 510; x += 5) x === -510 ? c.moveTo(x, P.terrain(x)) : c.lineTo(x, P.terrain(x));
    c.stroke();
    c.strokeStyle = '#a1885c70'; c.lineWidth = 1; c.stroke();
    if (s.mode === 'handoff') {
      drawBody(c, s.pumpkin, s.active === 'pumpkin'); drawBody(c, s.rutabaga, s.active === 'rutabaga');
      if (!s.handoffs) { ellipse(c, s.rutabaga.x, s.rutabaga.y + 70, 3, 3, '#8a648366'); }
    } else drawBody(c, s[s.active], true);
    c.restore();
    // Left/right hints use the same screen zones as scene.touch.
    c.save(); c.fillStyle = '#9c856348'; c.font = '15px sans-serif'; c.textAlign = 'center';
    for (const [x, dir] of [[70, '←'], [930, '→']]) { c.save(); c.translate(x, 550); c.scale(1, -1); c.fillText(dir, 0, 0); c.restore(); }
    c.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
