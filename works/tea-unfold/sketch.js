(function (root) {
  'use strict';
  const M = root.TeaUnfoldModel;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tea = new M.Tea({ ambientMotion: reduced ? 0 : 1 });
  const W = 390, H = 740, ROWS = 28, COLS = 12;
  const ui = Object.fromEntries(['interface', 'start', 'again', 'sound', 'hint', 'clock', 'announce'].map(id => [id, document.getElementById(id)]));
  let lastSecond = -1, lastMode = '', finger = null, paused = false, lastLayout = '';
  const now = () => performance.now();

  function start() {
    if (!tea.start(now())) return;
    SSE.audio.unlock();
    ui.announce.textContent = 'お湯を注ぎました。30秒、茶葉がひらくのを待ちます。';
    sync();
  }
  function reset() {
    tea.reset(); finger = null; lastSecond = -1; lastMode = '';
    ui.announce.textContent = '新しいひと葉。グラスに触れて、お湯を注ぐ。';
    sync();
  }
  function sync() {
    const seconds = Math.ceil(M.DURATION - tea.elapsed);
    if (seconds !== lastSecond) {
      ui.clock.textContent = `0:${String(seconds).padStart(2, '0')}`;
      ui.clock.setAttribute('aria-label', `残り${seconds}秒`);
      lastSecond = seconds;
    }
    if (tea.mode !== lastMode) {
      ui.start.hidden = tea.mode !== 'ready'; ui.again.hidden = tea.mode === 'ready';
      ui.hint.textContent = tea.mode === 'ready' ? 'グラスに触れて、お湯を注ぐ' : tea.mode === 'rest' ? 'ひらいた葉に、もう少し触れて' : '水をそっとなぞると、葉も揺れる';
      lastMode = tea.mode;
    }
    ui.sound.textContent = SSE.audio.enabled ? '音あり' : '音なし';
    ui.sound.setAttribute('aria-pressed', String(SSE.audio.enabled));
    ui.sound.setAttribute('aria-label', SSE.audio.enabled ? '終了音を切る' : '終了音を入れる');
  }
  function glassPath(c) {
    c.beginPath(); c.moveTo(75, 211);
    c.bezierCurveTo(77, 300, 83, 473, 100, 539);
    c.bezierCurveTo(109, 572, 281, 572, 290, 539);
    c.bezierCurveTo(307, 473, 313, 300, 315, 211);
    c.closePath();
  }
  function ellipse(c, x, y, rx, ry, fill, stroke) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function line(c, points, color, width = 1) {
    c.beginPath(); c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.lineWidth = width; c.lineCap = 'round'; c.strokeStyle = color; c.stroke();
  }
  function glassBack(c) {
    const shadow = c.createRadialGradient(195, 568, 5, 195, 568, 126);
    shadow.addColorStop(0, '#6f76592a'); shadow.addColorStop(1, '#6f765900');
    ellipse(c, 195, 573, 130, 24, shadow);
    const g = c.createLinearGradient(75, 0, 315, 0);
    g.addColorStop(0, '#ffffff73'); g.addColorStop(0.12, '#ffffff24');
    g.addColorStop(0.62, '#fafbed3b'); g.addColorStop(1, '#cad2bd69');
    glassPath(c); c.fillStyle = g; c.fill();
    c.lineWidth = 1.1; c.strokeStyle = '#899b8448'; c.stroke();
    ellipse(c, 195, 211, 120, 30, '#ffffff24', '#8e9d8857');
    line(c, [{ x: 87, y: 239 }, { x: 95, y: 403 }, { x: 108, y: 522 }], '#ffffff6b', 3);
  }
  function water(c) {
    if (tea.mode === 'ready') return;
    const fill = M.smooth(0, 1.8, tea.elapsed);
    const y = 548 - 279 * fill;
    const tilt = M.clamp(tea.water.x * 0.12, -7, 7) * (reduced ? 0.35 : 1);
    c.save(); glassPath(c); c.clip();
    const g = c.createLinearGradient(0, y, 0, 552);
    const brew = M.smooth(4, 30, tea.elapsed);
    g.addColorStop(0, `rgba(183,193,141,${0.13 + brew * 0.08})`);
    g.addColorStop(0.6, `rgba(164,179,112,${0.18 + brew * 0.08})`);
    g.addColorStop(1, `rgba(156,168,100,${0.21 + brew * 0.08})`);
    c.beginPath(); c.moveTo(60, y - tilt); c.lineTo(330, y + tilt);
    c.lineTo(330, 575); c.lineTo(60, 575); c.closePath(); c.fillStyle = g; c.fill();
    c.save(); c.translate(195, y); c.rotate(tilt / 120);
    c.lineWidth = 0.8;
    ellipse(c, 0, 0, 113, 25 * fill + 2, '#e6ecd450', '#a3b28260');
    const motion = Math.min(1, Math.hypot(tea.water.vx, tea.water.vy) / 85);
    for (let i = 0; i < 3; i++) {
      const r = 30 + i * 24 + Math.sin(tea.water.x * 0.03 + i) * motion * 6;
      ellipse(c, tea.water.x * 0.18, tea.water.y * 0.025, r, r * 0.2, null, `rgba(255,255,237,${0.06 + motion * 0.18})`);
    }
    c.restore();
    // Refraction stays inside the vessel and follows the same water state.
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(88, y + 33 + i * 88);
      c.bezierCurveTo(130, y + 20 + i * 88 + tea.water.y * 0.1,
        240, y + 44 + i * 88 + tea.water.x * 0.15, 302, y + 29 + i * 88);
      c.strokeStyle = '#f8fae53b'; c.stroke();
    }
    c.restore();
    // Brief pour, with no persistent stream or decorative particle system.
    if (tea.elapsed < 1.7) {
      const a = Math.sin(M.clamp(tea.elapsed / 1.7) * Math.PI);
      c.beginPath(); c.moveTo(248, 157); c.bezierCurveTo(237, 202, 232, 221, 228, y);
      c.strokeStyle = `rgba(244,249,233,${a * 0.75})`; c.lineWidth = 5 * a; c.lineCap = 'round'; c.stroke();
    }
  }

  function leaf(c) {
    const pose = tea.pose(), time = tea.mode === 'ready' ? 0 : tea.elapsed;
    const project = (s, v) => {
      const p = M.rotate(M.leafPoint(s, v, time), pose.yaw, pose.pitch, pose.roll);
      // Slight perspective makes curled-away tips actually recede.
      const perspective = 430 / (430 + p.z);
      return { x: pose.x + p.x * perspective, y: pose.y + p.y * perspective, z: p.z, raw: p };
    };
    const points = Array.from({ length: ROWS + 1 }, (_, i) =>
      Array.from({ length: COLS + 1 }, (_, j) => project(i / ROWS, j / COLS * 2 - 1)));
    const faces = [];
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      const p = [points[i][j], points[i + 1][j], points[i + 1][j + 1], points[i][j + 1]];
      faces.push({ p, i, j, depth: p.reduce((sum, q) => sum + q.z, 0) / 4 });
    }
    faces.sort((a, b) => b.depth - a.depth);
    c.save(); glassPath(c); c.clip();
    const wet = tea.mode !== 'ready', swell = M.opening(time).swell;
    for (const face of faces) {
      const { p, i, j } = face, a = p[0].raw, b = p[1].raw, d = p[3].raw;
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const v = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z };
      const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const len = Math.hypot(n.x, n.y, n.z) || 1;
      const light = Math.abs((-0.32 * n.x - 0.24 * n.y - 0.85 * n.z) / len);
      const back = n.z > 0;
      const grain = Math.sin(i * 4.13 + j * 1.83) * 3;
      const shade = 0.58 + light * 0.48;
      const base = wet ? (back ? [113, 125, 61] : [85, 108, 42]) : [85, 83, 46];
      const color = `rgb(${base.map((value, k) => Math.round(value * shade + grain + swell * (k === 1 ? 8 : 3))).join(',')})`;
      c.beginPath(); c.moveTo(p[0].x, p[0].y);
      for (const q of p.slice(1)) c.lineTo(q.x, q.y);
      c.closePath(); c.fillStyle = color; c.fill();
      // A matching subpixel stroke closes tessellation seams, not a wireframe.
      c.strokeStyle = color; c.lineWidth = 0.55; c.stroke();
      if (i % 4 === 1) {
        const v1 = j / COLS * 2 - 1, v2 = (j + 1) / COLS * 2 - 1;
        line(c, [project((i + 0.25 + Math.abs(v1) * 0.8) / ROWS, v1), project((i + 0.25 + Math.abs(v2) * 0.8) / ROWS, v2)],
          back ? '#d1cf8246' : '#b9c17857', 0.55);
      }
      if (j === COLS / 2) line(c, [points[i][j], points[i + 1][j]], wet ? '#c5c786ad' : '#b1ab7180', 1.05);
    }
    // Stem belongs to the same deformed midrib, rather than a fixed tail.
    line(c, [project(0, 0), project(0.018, 0), project(0.065, 0)], '#797946', 1.5);
    c.restore();
  }
  function glassFront(c) {
    c.lineWidth = 1.25;
    c.beginPath(); c.moveTo(75, 211); c.bezierCurveTo(78, 340, 82, 477, 100, 539);
    c.bezierCurveTo(109, 572, 281, 572, 290, 539); c.bezierCurveTo(308, 477, 312, 340, 315, 211);
    c.strokeStyle = '#97a48a75'; c.stroke();
    c.beginPath(); c.ellipse(195, 211, 120, 30, 0, 0, Math.PI); c.strokeStyle = '#fffff1b3'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(195, 211, 120, 30, 0, 0, Math.PI); c.strokeStyle = '#8c9a7970'; c.lineWidth = 0.8; c.stroke();
    line(c, [{ x: 302, y: 264 }, { x: 294, y: 448 }, { x: 285, y: 515 }], '#ffffff66', 3);
    ellipse(c, 195, 552, 93, 10, null, '#ffffff5f');
    ellipse(c, 195, 556, 87, 7, null, '#7e8c682f');
  }
  function layout() {
    const canvas = CodeaLite.state.canvas, bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / W, bounds.height / H);
    const key = [bounds.left, bounds.top, bounds.width, bounds.height].join(':');
    if (key === lastLayout) return;
    lastLayout = key;
    ui.interface.style.left = `${bounds.left + (bounds.width - W * scale) / 2}px`;
    ui.interface.style.top = `${bounds.top + (bounds.height - H * scale) / 2}px`;
    ui.interface.style.transform = `scale(${scale})`;
    ui.interface.classList.toggle('landscape', bounds.width / bounds.height > 1.35);
    ui.interface.style.setProperty('--button-height', `${Math.max(44, 44 / scale)}px`);
    ui.interface.style.setProperty('--button-font', `${Math.max(11, 11 / scale)}px`);
    ui.interface.style.setProperty('--hint-font', `${Math.max(12, 12 / scale)}px`);
  }
  function inGlass(p) { return p.x >= 78 && p.x <= 312 && p.y >= 189 && p.y <= 562; }
  const scene = {
    opaque: true,
    update(dt) {
      if (paused) return;
      if (tea.update(dt, now())) {
        ui.announce.textContent = '30秒経ちました。茶葉がひらきました。';
        if (!document.hidden) SSE.audio.tone({ frequency: 740, endFrequency: 710, type: 'sine', duration: 0.6,
          volume: SSE.audio.baseline().reference.se.ui * 0.35 });
      }
      sync();
    },
    draw() {
      background(238, 236, 226);
      withCanvasContext(c => {
        c.scale(1, -1); c.translate(0, -H);
        glassBack(c); water(c); leaf(c); glassFront(c);
      });
      layout();
    },
    touch(t) {
      const p = { x: t.x, y: H - t.y };
      if (t.state === BEGAN) {
        if (!inGlass(p)) return true;
        if (tea.mode === 'ready') start();
        finger = p; tea.begin(p.x, p.y);
      } else if (t.state === MOVING && finger) {
        if (inGlass(p)) { tea.drag(p.x, p.y); finger = p; }
        else { tea.release(); finger = null; }
      } else if (t.state === ENDED || t.state === CANCELLED) {
        tea.release(); finger = null;
      }
      return true;
    },
  };
  SSE.createApp({ id: SUKIMASTOCK_WORK.id, logicalWidth: W, logicalHeight: H,
    frameRate: SUKIMASTOCK_WORK.frameRate, initialScene: 'tea', debug: false, pointerMode: 'primary',
    outerBackground: '#eeece2',
    keyboard: { enabled: false }, audio: SSE.audio.withBaseline({ storageKey: 'tea-unfold.sound' }),
    analytics: { enabled: false }, scenes: { tea: scene } });
  ui.start.addEventListener('click', start);
  ui.again.addEventListener('click', reset);
  ui.sound.addEventListener('click', () => { SSE.audio.setEnabled(!SSE.audio.enabled); sync(); });
  // Native buttons support keyboard and screen readers; they do not share
  // canvas keyboard bindings, avoiding Space double-start/reset.
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden; tea.release(); finger = null;
  });
  root.addEventListener('blur', () => { tea.release(); finger = null; });
  root.addEventListener('pagehide', () => { paused = true; tea.release(); finger = null; });
  root.addEventListener('pageshow', () => { paused = document.hidden; });
  // Read-only observations; no mutable test hooks or alternate game path.
  root.TeaUnfold = Object.freeze({ snapshot: () => tea.snapshot() });
})(window);
