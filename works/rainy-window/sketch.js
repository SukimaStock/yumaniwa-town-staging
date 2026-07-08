// ==========================================
// 030 Rainy Window / Web Edition
// 指でなぞると曇りが拭われ、離した場所に水滴が集まる。
// Codea版を、湯間庭町のRakugaki Engine用に移植した作品です。
// ==========================================

// 移植直後の一度だけ true にして、タッチ位置と座標の上下を確認します。
// 公開時は必ず false のままにします。
var COORDINATE_CHECK = false;

var CONFIG = {
  tinyDropCount: 520,
  maxDrops: 54,
  maxTrails: 70,
  rainChancePerSecond: 5.8,
  fogBaseAlpha: 0.22,
  fogReturnPerSecond: 0.014,
  growthPerSecond: 0.17,
  slideThresholdBase: 6.2,
  gravity: 48,
  windowStickiness: 0.82,
  backgroundMood: 1.0
};

var tinyDrops = [];
var drops = [];
var trails = [];
var touchPaths = {};

// Codea座標で扱えるオフスクリーン層。
// ブラウザCanvasの左上原点への変換はRakugaki Engineが吸収する。
var fogLayer = null;
var fogScale = 0.58;
var lastWidth = 0;
var lastHeight = 0;
var rainAccumulator = 0;

function setup() {
  noStroke();
  noiseSeed(3010);
  tuneForScreen();
  rebuildWindow();
}

function resized() {
  tuneForScreen();
  rebuildWindow();
}

function tuneForScreen() {
  var minSide = Math.min(WIDTH, HEIGHT);
  CONFIG.tinyDropCount = minSide < 520 ? 430 : 620;
  CONFIG.maxDrops = minSide < 520 ? 46 : 64;
  CONFIG.maxTrails = minSide < 520 ? 58 : 80;
}

function rebuildWindow() {
  lastWidth = Math.max(1, WIDTH);
  lastHeight = Math.max(1, HEIGHT);

  fogLayer = CodeaLite.createCodeaLayer(lastWidth, lastHeight, fogScale);

  fogLayer.withCodeaContext(function(ctx) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(179, 201, 217," + CONFIG.fogBaseAlpha + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  });

  addFogTexture();
  tinyDrops = [];
  drops = [];
  trails = [];
  touchPaths = {};
  initTinyDrops();
}

function addFogTexture() {
  if (!fogLayer) return;

  fogLayer.withCodeaContext(function(ctx) {
    for (var i = 0; i < 18; i++) {
      var x = Math.random() * WIDTH;
      var y = Math.random() * HEIGHT;
      var r = Math.min(WIDTH, HEIGHT) * (0.18 + Math.random() * 0.32);
      var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(220, 231, 238, 0.055)");
      grad.addColorStop(1, "rgba(220, 231, 238, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function initTinyDrops() {
  tinyDrops.length = 0;
  for (var i = 0; i < CONFIG.tinyDropCount; i++) {
    tinyDrops.push(makeTinyDrop(Math.random() * WIDTH, Math.random() * HEIGHT));
  }
}

function makeTinyDrop(x, y) {
  return {
    x: x,
    y: y,
    rx: 0.45 + Math.random() * 0.95,
    ry: 0.45 + Math.random() * 1.05,
    alpha: 42 + Math.random() * 108
  };
}

function draw() {
  var dt = Math.min(0.05, Math.max(0.001, DeltaTime || 1 / 60));

  drawNightBackground();
  restoreFog(dt);
  updateRain(dt);
  drawFogLayer();
  drawTinyDrops();
  drawTrails(dt);
  drawDrops();

  if (COORDINATE_CHECK) {
    CodeaLite.drawCoordinateGuide({
      label: "Codea座標確認：下 = y 0 / 上 = y HEIGHT"
    });
  }
}

function drawNightBackground() {
  background(9, 15, 23, 255);

  noStroke();
  fill(14, 24, 34, 255);
  rect(0, 0, WIDTH, HEIGHT * 0.24);

  fill(8, 13, 20, 255);
  rect(WIDTH * 0.06, 0, WIDTH * 0.18, HEIGHT * 0.46);
  rect(WIDTH * 0.60, 0, WIDTH * 0.24, HEIGHT * 0.35);
  rect(WIDTH * 0.88, 0, WIDTH * 0.11, HEIGHT * 0.55);

  drawBokeh(WIDTH * 0.17, HEIGHT * 0.38, 74, 255, 186, 96, 0.34);
  drawBokeh(WIDTH * 0.73, HEIGHT * 0.55, 94, 154, 205, 255, 0.20);
  drawBokeh(WIDTH * 0.52, HEIGHT * 0.25, 56, 255, 108, 88, 0.15);
  drawBokeh(WIDTH * 0.91, HEIGHT * 0.70, 46, 255, 224, 154, 0.18);

  fill(26, 36, 45, 220);
  rect(0, HEIGHT * 0.16, WIDTH, 3);
  fill(33, 45, 56, 120);
  rect(0, HEIGHT * 0.16 + 6, WIDTH, 1);

  // 遠くの窓明かり。動きは最小限にして、雨粒の変化を主役にする。
  for (var i = 0; i < 12; i++) {
    var px = (i * 71 + 29) % WIDTH;
    var py = HEIGHT * (0.20 + ((i * 17) % 28) / 100);
    var pulse = 0.72 + Math.sin(ElapsedTime * 0.7 + i * 1.9) * 0.08;
    fill(255, 214, 133, 42 * pulse);
    rect(px, py, 10, 3);
  }
}

function drawBokeh(x, y, radius, r, g, b, alpha) {
  for (var i = 5; i >= 1; i--) {
    var t = i / 5;
    fill(r, g, b, alpha * 255 * (0.03 + (1 - t) * 0.035));
    ellipse(x, y, radius * t * 2, radius * t * 2);
  }
  fill(r, g, b, alpha * 255 * 0.32);
  ellipse(x, y, radius * 0.32, radius * 0.32);
}

function restoreFog(dt) {
  if (!fogLayer) return;

  fogLayer.withCodeaContext(function(ctx) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(179, 201, 217," + (CONFIG.fogReturnPerSecond * dt) + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  });
}

function drawFogLayer() {
  if (!fogLayer) return;
  fogLayer.drawToScreen(0, 0, WIDTH, HEIGHT, { smoothing: true });
}

function eraseFogEllipse(x, y, rx, ry, amount) {
  if (!fogLayer) return;
  fogLayer.eraseSoftEllipse(x, y, rx, ry, amount);
}

function eraseFogSegment(x1, y1, x2, y2, radius, amount) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.max(1, Math.ceil(distance / Math.max(4, radius * 0.55)));

  for (var i = 0; i <= steps; i++) {
    var t = i / steps;
    eraseFogEllipse(x1 + dx * t, y1 + dy * t, radius, radius * 0.88, amount);
  }
}

function updateRain(dt) {
  rainAccumulator += dt;
  var chance = CONFIG.rainChancePerSecond * dt;

  if (Math.random() < chance && drops.length < CONFIG.maxDrops) {
    if (Math.random() < 0.38) {
      drops.push(makeDrop(Math.random() * WIDTH, HEIGHT + 18, 0.9 + Math.random() * 1.8, "falling"));
    } else {
      drops.push(makeDrop(Math.random() * WIDTH, Math.random() * HEIGHT, 0.75 + Math.random() * 1.55, "growing"));
    }
  }

  while (tinyDrops.length < CONFIG.tinyDropCount && Math.random() < 0.62) {
    tinyDrops.push(makeTinyDrop(Math.random() * WIDTH, Math.random() * HEIGHT));
  }

  for (var i = drops.length - 1; i >= 0; i--) {
    var d = drops[i];
    updateDrop(d, dt);

    if (d.y < -70 || d.x < -70 || d.x > WIDTH + 70 || d.dead) {
      drops.splice(i, 1);
    }
  }

  mergeDrops();
}

function makeDrop(x, y, r, state) {
  var drop = {
    x: x,
    y: y,
    r: r,
    rx: r * (0.9 + Math.random() * 0.18),
    ry: r * (0.95 + Math.random() * 0.18),
    vx: (Math.random() - 0.5) * 3,
    vy: state === "falling" ? -(38 + Math.random() * 52) : -(Math.random() * 4),
    state: state || "growing",
    age: 0,
    slideLimit: CONFIG.slideThresholdBase + Math.random() * 4.8 - 2.2,
    trailClock: Math.random() * 0.14,
    seed: Math.random() * 1000,
    dead: false
  };
  return drop;
}

function updateDrop(d, dt) {
  d.age += dt;

  if (d.state === "falling") {
    d.y += d.vy * dt;
    if (d.y < HEIGHT * (0.08 + Math.random() * 0.86)) {
      d.state = "growing";
      d.vy *= 0.08;
    }
    return;
  }

  if (d.state === "growing") {
    d.r += CONFIG.growthPerSecond * dt * (0.75 + Math.random() * 0.55);
    d.rx = d.r * (0.88 + noise(d.seed, ElapsedTime * 0.25) * 0.16);
    d.ry = d.r * (0.95 + noise(d.seed + 90, ElapsedTime * 0.25) * 0.16);
    d.x += (noise(d.seed, ElapsedTime * 0.35) - 0.5) * dt * 1.9;
    d.y += (noise(d.seed + 41, ElapsedTime * 0.35) - 0.5) * dt * 1.3;

    if (d.r > d.slideLimit) {
      d.state = "sliding";
      d.vy -= 6 + Math.random() * 8;
    }
    return;
  }

  if (d.state === "sliding") {
    d.vy -= CONFIG.gravity * dt;
    d.vx += (noise(d.seed, ElapsedTime * 0.5) - 0.5) * dt * 7;
    d.vx *= Math.pow(0.80, dt * 60);
    d.vy *= Math.pow(0.988, dt * 60);

    var speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
    var friction = CONFIG.windowStickiness * Math.min(1, 0.5 + d.r * 0.08);
    if (speed < friction) {
      d.vy *= 0.89;
    }

    d.x += d.vx * dt;
    d.y += d.vy * dt;

    d.trailClock += dt;
    if (d.trailClock > 0.075 && speed > 18) {
      d.trailClock = 0;
      var trailLength = Math.min(46, 12 + speed * 0.34);
      eraseFogEllipse(d.x, d.y + trailLength * 0.55, Math.max(3.4, d.r * 0.80), trailLength, 0.58);
      clearTinyDrops(d.x, d.y + trailLength * 0.45, d.r * 1.45, trailLength * 0.55);

      if (trails.length < CONFIG.maxTrails && Math.random() < 0.52) {
        trails.push({
          x: d.x - d.vx * 0.008,
          y: d.y - d.vy * 0.008,
          r: Math.max(0.65, d.r * 0.25),
          alpha: 74 + Math.random() * 48,
          life: 0.7 + Math.random() * 1.3
        });
      }
    }
  }
}

function mergeDrops() {
  for (var i = 0; i < drops.length; i++) {
    var a = drops[i];
    if (a.dead) continue;

    for (var j = i + 1; j < drops.length; j++) {
      var b = drops[j];
      if (b.dead) continue;

      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var distSq = dx * dx + dy * dy;
      var threshold = (a.r + b.r) * 0.76;

      if (distSq < threshold * threshold) {
        var areaA = a.r * a.r;
        var areaB = b.r * b.r;
        var total = areaA + areaB;

        a.x = (a.x * areaA + b.x * areaB) / total;
        a.y = (a.y * areaA + b.y * areaB) / total;
        a.vx = (a.vx * areaA + b.vx * areaB) / total;
        a.vy = (a.vy * areaA + b.vy * areaB) / total;
        a.r = Math.sqrt(total);
        a.rx = a.r * (0.92 + Math.random() * 0.15);
        a.ry = a.r * (0.96 + Math.random() * 0.17);

        if (a.state === "sliding" || b.state === "sliding" || a.r > a.slideLimit) {
          a.state = "sliding";
        }
        b.dead = true;
      }
    }
  }
}

function drawTinyDrops() {
  noStroke();
  for (var i = 0; i < tinyDrops.length; i++) {
    var td = tinyDrops[i];
    fill(175, 205, 226, td.alpha);
    ellipse(td.x, td.y, td.rx * 2, td.ry * 2);
  }
}

function drawTrails(dt) {
  noStroke();
  for (var i = trails.length - 1; i >= 0; i--) {
    var t = trails[i];
    t.life -= dt;
    t.alpha -= dt * 46;

    if (t.life <= 0 || t.alpha <= 0) {
      trails.splice(i, 1);
      continue;
    }

    fill(165, 197, 219, Math.max(0, t.alpha));
    ellipse(t.x, t.y, t.r * 2, t.r * 2.4);
  }
}

function drawDrops() {
  noStroke();

  for (var i = 0; i < drops.length; i++) {
    var d = drops[i];
    var moving = d.state === "sliding";
    var stretch = moving ? Math.min(1.9, 1 + Math.abs(d.vy) * 0.012) : 1;

    fill(137, 178, 211, 136);
    ellipse(d.x, d.y, d.rx * 2 / stretch, d.ry * 2 * stretch);

    fill(225, 241, 250, 125);
    ellipse(
      d.x - d.rx * 0.26,
      d.y + d.ry * 0.24 * stretch,
      Math.max(0.7, d.rx * 0.72),
      Math.max(0.8, d.ry * 0.54 * stretch)
    );

    fill(226, 239, 248, 64);
    ellipse(d.x + d.rx * 0.15, d.y - d.ry * 0.18, Math.max(0.55, d.rx * 0.38), Math.max(0.55, d.ry * 0.38));
  }
}

function clearTinyDrops(x, y, rx, ry) {
  for (var i = tinyDrops.length - 1; i >= 0; i--) {
    var td = tinyDrops[i];
    if (Math.abs(td.x - x) < rx && Math.abs(td.y - y) < ry) {
      tinyDrops.splice(i, 1);
    }
  }
}

function touched(touch) {
  var id = touch.id || 0;

  if (touch.state === BEGAN) {
    touchPaths[id] = { x: touch.x, y: touch.y };
    eraseFogEllipse(touch.x, touch.y, 18, 16, 0.72);
    clearTinyDrops(touch.x, touch.y, 22, 19);
    return;
  }

  if (touch.state === MOVING || touch.state === CHANGED) {
    var last = touchPaths[id] || { x: touch.prevX, y: touch.prevY };
    eraseFogSegment(last.x, last.y, touch.x, touch.y, 17, 0.82);
    clearTinyDrops(touch.x, touch.y, 23, 20);
    touchPaths[id] = { x: touch.x, y: touch.y };
    return;
  }

  if (touch.state === ENDED || touch.state === CANCELLED) {
    var previous = touchPaths[id] || { x: touch.x, y: touch.y };
    eraseFogSegment(previous.x, previous.y, touch.x, touch.y, 17, 0.84);
    clearTinyDrops(touch.x, touch.y, 24, 21);

    if (touch.state === ENDED) {
      spawnFingerResidue(touch.x, touch.y);
    }
    delete touchPaths[id];
  }
}

function spawnFingerResidue(x, y) {
  if (drops.length < CONFIG.maxDrops) {
    var main = makeDrop(x, y, 4.8 + Math.random() * 2.7, "growing");
    main.slideLimit = CONFIG.slideThresholdBase - 0.9 + Math.random() * 1.8;
    main.vy = -2;
    drops.push(main);
  }

  for (var i = 0; i < 4 && drops.length < CONFIG.maxDrops; i++) {
    var angle = Math.random() * Math.PI * 2;
    var distance = 8 + Math.random() * 26;
    var residue = makeDrop(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance * 0.70,
      1.3 + Math.random() * 2.0,
      "growing"
    );
    residue.slideLimit = CONFIG.slideThresholdBase + Math.random() * 1.9;
    drops.push(residue);
  }
}
