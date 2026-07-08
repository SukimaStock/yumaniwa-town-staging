// ==========================================
// 湯間庭町 / Rakugaki Engine v1
// 触れるらくがき作品専用の、Codea風互換レイヤーです。
// 既存作品を壊さないため、このファイルは v1 として固定します。
// 大きな仕様変更は rakugaki-engine.v2.js を新設して行います。
// ==========================================

// Rakugaki engine
// A tiny compatibility layer for moving Codea-style sketches to HTML Canvas.
// Goal: keep sketch code close to Codea: setup(), draw(), touched(touch), WIDTH, HEIGHT.
//
// 座標契約（v1で固定）
// - 作品側は常に Codea 座標：左下が (0, 0)、右上が (WIDTH, HEIGHT)、Y は上向き。
// - DOM Canvas / オフスクリーン描画は createCodeaLayer() を経由し、
//   ブラウザ標準の左上原点との変換をエンジン内へ閉じ込める。

(function () {
  "use strict";

  const C = {
    canvas: null,
    ctx: null,
    dpr: 1,
    width: 0,
    height: 0,
    started: false,
    startTime: 0,
    lastTime: 0,
    deltaTime: 0,
    elapsedTime: 0,

    fillStyle: { r: 255, g: 255, b: 255, a: 255 },
    strokeStyle: { r: 0, g: 0, b: 0, a: 255 },
    hasFill: true,
    hasStroke: true,
    lineWidth: 1,
    lineCap: "round",
    lineJoin: "round",
    rectMode: "CORNER",
    ellipseMode: "CENTER",
    textAlign: "center",
    textSize: 16,
    fontName: 'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif',

    pointers: new Map(),
    tweens: new Set(),
    clipActive: false,
    clipDepth: 0,
    blendMode: "source-over",
    styleStack: [],
    noiseSeed: 0,
    lastTouch: null,
};


  const BEGAN = "BEGAN";
  const MOVING = "MOVING";
  const CHANGED = MOVING;
  const ENDED = "ENDED";
  const CANCELLED = "CANCELLED";

  const NORMAL = "NORMAL";
  const ADDITIVE = "ADDITIVE";

  const CORNER = "CORNER";
  const CENTER = "CENTER";
  const LEFT = "LEFT";
  const RIGHT = "RIGHT";

const ROUND = "ROUND";
const SQUARE = "SQUARE";
const PROJECT = "PROJECT";
const BEVEL = "BEVEL";
const MITER = "MITER";


  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function color(r, g, b, a = 255) {
    if (typeof r === "object" && r !== null) {
      return {
        r: r.r ?? 0,
        g: r.g ?? 0,
        b: r.b ?? 0,
        a: r.a ?? 255,
      };
    }
    return {
      r: clamp(Math.round(r ?? 0), 0, 255),
      g: clamp(Math.round(g ?? r ?? 0), 0, 255),
      b: clamp(Math.round(b ?? r ?? 0), 0, 255),
      a: clamp(Math.round(a), 0, 255),
    };
  }

  function rgba(c) {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
  }

  function parseColorArgs(args) {
    if (args.length === 1 && typeof args[0] === "object") return color(args[0]);
    if (args.length === 1) return color(args[0], args[0], args[0], 255);
    if (args.length === 2) return color(args[0], args[0], args[0], args[1]);
    if (args.length === 3) return color(args[0], args[1], args[2], 255);
    return color(args[0], args[1], args[2], args[3]);
  }

  class Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    copy() { return new Vec2(this.x, this.y); }
    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    mul(s) { return new Vec2(this.x * s, this.y * s); }
    div(s) { return new Vec2(this.x / s, this.y / s); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    len() { return Math.hypot(this.x, this.y); }
    dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
    normalize() {
      const l = this.len();
      return l > 0.000001 ? this.div(l) : new Vec2(0, 0);
    }
    limit(max) {
      const l = this.len();
      return l > max ? this.normalize().mul(max) : this.copy();
    }
    rotate(deg) {
      const rad = deg * Math.PI / 180;
      const cs = Math.cos(rad);
      const sn = Math.sin(rad);
      return new Vec2(this.x * cs - this.y * sn, this.x * sn + this.y * cs);
    }
  }

  function vec2(x = 0, y = 0) {
    return new Vec2(x, y);
  }

  function resize() {
    const canvas = C.canvas;
    const previousWidth = C.width;
    const previousHeight = C.height;

    C.dpr = Math.max(
        1,
        window.devicePixelRatio || 1
    );

    C.width = Math.max(
        1,
        window.innerWidth
    );

    C.height = Math.max(
        1,
        window.innerHeight
    );

    canvas.style.width =
        String(C.width) + "px";

    canvas.style.height =
        String(C.height) + "px";

    canvas.width = Math.floor(
        C.width * C.dpr
    );

    canvas.height = Math.floor(
        C.height * C.dpr
    );

    C.clipActive = false;
    C.clipDepth = 0;

    resetTransform();

    if (
        C.started &&
        typeof window.resized === "function"
    ) {
        window.resized(
            C.width,
            C.height,
            previousWidth,
            previousHeight
        );
    }
}


  function resetTransform() {
    // Codea-like coordinate system: origin at bottom-left, y goes upward.
    C.ctx.setTransform(C.dpr, 0, 0, -C.dpr, 0, C.canvas.height);
  }

  function background(...args) {
    const c = parseColorArgs(args);
    const ctx = C.ctx;
    ctx.save();
    ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(c);
    ctx.fillRect(0, 0, C.width, C.height);
    ctx.restore();
  }

  function fill(...args) {
    C.fillStyle = parseColorArgs(args);
    C.hasFill = true;
  }

  function noFill() {
    C.hasFill = false;
  }

  function stroke(...args) {
    C.strokeStyle = parseColorArgs(args);
    C.hasStroke = true;
  }

  function noStroke() {
    C.hasStroke = false;
  }

  function strokeWidth(w) {
    C.lineWidth = w;
  }

  function cloneColor(c) {
    return { r: c.r, g: c.g, b: c.b, a: c.a };
  }

  function pushStyle() {
    C.styleStack.push({
      fillStyle: cloneColor(C.fillStyle),
      strokeStyle: cloneColor(C.strokeStyle),
      hasFill: C.hasFill,
      hasStroke: C.hasStroke,
      lineWidth: C.lineWidth,
      lineCap: C.lineCap,
      lineJoin: C.lineJoin,
      rectMode: C.rectMode,
      ellipseMode: C.ellipseMode,
      textAlign: C.textAlign,
      textSize: C.textSize,
      fontName: C.fontName,
      blendMode: C.blendMode,
    });
  }

  function popStyle() {
    const saved = C.styleStack.pop();
    if (!saved) return false;

    C.fillStyle = cloneColor(saved.fillStyle);
    C.strokeStyle = cloneColor(saved.strokeStyle);
    C.hasFill = saved.hasFill;
    C.hasStroke = saved.hasStroke;
    C.lineWidth = saved.lineWidth;
    C.lineCap = saved.lineCap;
    C.lineJoin = saved.lineJoin;
    C.rectMode = saved.rectMode;
    C.ellipseMode = saved.ellipseMode;
    C.textAlign = saved.textAlign;
    C.textSize = saved.textSize;
    C.fontName = saved.fontName;
    C.blendMode = saved.blendMode;
    return true;
  }

  function blendMode(mode) {
    const value = String(mode || NORMAL).toUpperCase();
    C.blendMode = value === ADDITIVE || value === "LIGHTER"
      ? "lighter"
      : "source-over";
    return C.blendMode;
  }

  function smoothNoise(t) {
    return t * t * (3 - 2 * t);
  }

  function hashNoise(x, y, z) {
    const v = Math.sin(
      x * 127.1 + y * 311.7 + z * 74.7 + C.noiseSeed * 0.173
    ) * 43758.5453123;
    return v - Math.floor(v);
  }

  function noise(x = 0, y = 0, z = 0) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = smoothNoise(x - xi);
    const yf = smoothNoise(y - yi);
    const zf = smoothNoise(z - zi);

    const n000 = hashNoise(xi, yi, zi);
    const n100 = hashNoise(xi + 1, yi, zi);
    const n010 = hashNoise(xi, yi + 1, zi);
    const n110 = hashNoise(xi + 1, yi + 1, zi);
    const n001 = hashNoise(xi, yi, zi + 1);
    const n101 = hashNoise(xi + 1, yi, zi + 1);
    const n011 = hashNoise(xi, yi + 1, zi + 1);
    const n111 = hashNoise(xi + 1, yi + 1, zi + 1);

    const nx00 = lerp(n000, n100, xf);
    const nx10 = lerp(n010, n110, xf);
    const nx01 = lerp(n001, n101, xf);
    const nx11 = lerp(n011, n111, xf);
    const nxy0 = lerp(nx00, nx10, yf);
    const nxy1 = lerp(nx01, nx11, yf);
    return lerp(nxy0, nxy1, zf);
  }

  function noiseSeed(seed) {
    C.noiseSeed = Number(seed) || 0;
  }

  function rectMode(mode) {
    C.rectMode = mode;
  }

  function ellipseMode(mode) {
    C.ellipseMode = mode;
  }

  function applyPaint() {
    const ctx = C.ctx;

    ctx.fillStyle =
        rgba(C.fillStyle);

    ctx.strokeStyle =
        rgba(C.strokeStyle);

    ctx.lineWidth =
        C.lineWidth;

    ctx.lineCap =
        C.lineCap;

    ctx.lineJoin =
        C.lineJoin;

    ctx.globalCompositeOperation =
        C.blendMode;
}

function normalizeStrokeCap(mode) {
    const value =
        String(mode).toUpperCase();

    if (value === "ROUND") {
        return "round";
    }

    if (
        value === "SQUARE" ||
        value === "PROJECT" ||
        value === "PROJECTING"
    ) {
        return "square";
    }

    if (
        value === "BUTT" ||
        value === "FLAT"
    ) {
        return "butt";
    }

    return null;
}

function normalizeStrokeJoin(mode) {
    const value =
        String(mode).toUpperCase();

    if (value === "ROUND") {
        return "round";
    }

    if (value === "BEVEL") {
        return "bevel";
    }

    if (value === "MITER") {
        return "miter";
    }

    return null;
}

function strokeCap(mode) {
    if (arguments.length === 0) {
        return C.lineCap;
    }

    const normalized =
        normalizeStrokeCap(mode);

    if (normalized) {
        C.lineCap =
            normalized;
    }

    return C.lineCap;
}

function strokeJoin(mode) {
    if (arguments.length === 0) {
        return C.lineJoin;
    }

    const normalized =
        normalizeStrokeJoin(mode);

    if (normalized) {
        C.lineJoin =
            normalized;
    }

    return C.lineJoin;
}



  function rect(x, y, w, h, radius = 0) {
    const ctx = C.ctx;
    applyPaint();

    if (C.rectMode === CENTER) {
      x -= w / 2;
      y -= h / 2;
    }

    ctx.beginPath();
    if (radius > 0) {
      const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, w, h);
    }
    if (C.hasFill) ctx.fill();
    if (C.hasStroke) ctx.stroke();
  }

  function ellipse(x, y, w, h = w) {
    const ctx = C.ctx;
    applyPaint();

    if (C.ellipseMode === CORNER) {
      x += w / 2;
      y += h / 2;
    }

    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
    if (C.hasFill) ctx.fill();
    if (C.hasStroke) ctx.stroke();
  }

  function line(x1, y1, x2, y2) {
    const ctx = C.ctx;
    applyPaint();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (C.hasStroke) ctx.stroke();
  }

  function textSize(size) {
    C.textSize = size;
  }

  function textAlign(align) {
    if (align === CENTER || String(align).toUpperCase() === "CENTER") {
      C.textAlign = "center";
    } else if (align === RIGHT || String(align).toUpperCase() === "RIGHT") {
      C.textAlign = "right";
    } else {
      C.textAlign = "left";
    }
  }

  function fontSize(size) {
    textSize(size);
  }

function font(fontName) {
    if (arguments.length === 0) {
        return C.fontName;
    }

    if (
        typeof fontName !== "string" ||
        fontName.trim().length === 0
    ) {
        return C.fontName;
    }

    C.fontName =
        fontName;

    return C.fontName;
}


// [PATCH: text]
function text(str, x, y) {
  const ctx = C.ctx;
  applyPaint();

  const value =
    String(str);

  ctx.save();

  ctx.translate(x, y);
  ctx.scale(1, -1);

  ctx.font =
    String(C.textSize) +
    "px " +
    C.fontName;

  const align =
    C.textAlign;

  const metrics =
    ctx.measureText(value);

  let offsetX = 0;

  if (align === "center") {
    if (
      metrics &&
      typeof metrics.actualBoundingBoxLeft === "number" &&
      typeof metrics.actualBoundingBoxRight === "number" &&
      isFinite(metrics.actualBoundingBoxLeft) &&
      isFinite(metrics.actualBoundingBoxRight)
    ) {
      offsetX =
        (
          metrics.actualBoundingBoxLeft -
          metrics.actualBoundingBoxRight
        ) *
        0.5;
    } else {
      offsetX =
        -metrics.width * 0.5;
    }
  } else if (align === "right") {
    offsetX =
      -metrics.width;
  }

  ctx.textAlign =
    "left";

  ctx.textBaseline =
    "middle";

  ctx.direction =
    "ltr";

  ctx.fillStyle =
    rgba(C.fillStyle);

  ctx.strokeStyle =
    rgba(C.strokeStyle);

  ctx.lineWidth =
    C.lineWidth;

  if (C.hasFill) {
    ctx.fillText(
      value,
      offsetX,
      0
    );
  }

  if (C.hasStroke) {
    ctx.strokeText(
      value,
      offsetX,
      0
    );
  }

  ctx.restore();
}
// [END_PATCH]

  function pushMatrix() {
    C.ctx.save();
  }

  function popMatrix() {
    C.ctx.restore();
  }

  function translate(x, y) {
    C.ctx.translate(x, y);
  }

  function rotate(deg) {
    C.ctx.rotate(deg * Math.PI / 180);
  }

  function scale(x, y = x) {
    C.ctx.scale(x, y);
  }

function withCanvasContext(drawFunction) {
    if (
        !C.ctx ||
        typeof drawFunction !== "function"
    ) {
        return;
    }

    const ctx = C.ctx;

    ctx.save();

    try {
        applyPaint();

        return drawFunction(
            ctx,
            C
        );
    } finally {
        ctx.restore();
    }
}


// ----------------------------------------------------------
// Codea coordinates for offscreen / DOM canvas layers
// ----------------------------------------------------------
// Browser canvas APIs use a top-left origin, but sketches in this engine
// use Codea coordinates. This adapter keeps every conversion in one place.
function createCodeaLayer(width, height, pixelScale) {
    var layer = {
        canvas: document.createElement("canvas"),
        ctx: null,
        width: 0,
        height: 0,
        pixelScale: 1,

        resize: function(newWidth, newHeight, newPixelScale) {
            this.width = Math.max(1, Number(newWidth) || 1);
            this.height = Math.max(1, Number(newHeight) || 1);
            this.pixelScale = clamp(
                Number(newPixelScale === undefined ? this.pixelScale : newPixelScale) || 1,
                0.1,
                4
            );

            this.canvas.width = Math.max(1, Math.round(this.width * this.pixelScale));
            this.canvas.height = Math.max(1, Math.round(this.height * this.pixelScale));
            this.ctx = this.canvas.getContext("2d");
            return this;
        },

        clear: function() {
            if (!this.ctx) return;
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        },

        // callback(ctx, layer) receives a CanvasRenderingContext2D whose
        // coordinate space is Codea-style: left-bottom origin, Y upward.
        withCodeaContext: function(callback) {
            if (!this.ctx || typeof callback !== "function") return;

            var ctx = this.ctx;
            ctx.save();
            ctx.setTransform(
                this.pixelScale,
                0,
                0,
                -this.pixelScale,
                0,
                this.canvas.height
            );

            try {
                return callback(ctx, this);
            } finally {
                ctx.restore();
            }
        },

        // Useful for rare diagnostics. Most sketches should prefer
        // withCodeaContext() and never need this conversion directly.
        worldToCanvas: function(x, y) {
            return {
                x: x * this.pixelScale,
                y: this.canvas.height - y * this.pixelScale
            };
        },

        canvasToWorld: function(x, y) {
            return {
                x: x / this.pixelScale,
                y: (this.canvas.height - y) / this.pixelScale
            };
        },

        eraseSoftEllipse: function(x, y, radiusX, radiusY, amount) {
            var rx = Math.max(0.01, Number(radiusX) || 0.01);
            var ry = Math.max(0.01, Number(radiusY) || 0.01);
            var alpha = clamp(Number(amount === undefined ? 0.8 : amount) || 0, 0, 1);
            var maxRadius = Math.max(rx, ry);

            return this.withCodeaContext(function(ctx) {
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.translate(x, y);
                ctx.scale(rx / maxRadius, ry / maxRadius);

                var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
                gradient.addColorStop(0, "rgba(0, 0, 0, " + alpha + ")");
                gradient.addColorStop(0.62, "rgba(0, 0, 0, " + Math.min(0.74, alpha * 0.66) + ")");
                gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        },

        // Draw the browser-backed layer into the main Codea canvas without
        // requiring the sketch to flip Y manually.
        drawToScreen: function(x, y, drawWidth, drawHeight, options) {
            if (!C.ctx || !this.canvas) return;

            var dx = x === undefined ? 0 : x;
            var dy = y === undefined ? 0 : y;
            var dw = drawWidth === undefined ? C.width : drawWidth;
            var dh = drawHeight === undefined ? C.height : drawHeight;
            var opts = options || {};
            var alpha = opts.alpha === undefined ? 1 : clamp(Number(opts.alpha) || 0, 0, 1);

            var ctx = C.ctx;
            ctx.save();
            ctx.globalCompositeOperation = opts.compositeOperation || "source-over";
            ctx.globalAlpha = alpha;

            if (opts.smoothing !== undefined) {
                ctx.imageSmoothingEnabled = !!opts.smoothing;
            }

            // Source canvas is top-left origin. Map it into a Codea rect
            // whose lower-left corner is (dx, dy).
            ctx.translate(dx, dy + dh);
            ctx.scale(dw / this.canvas.width, -dh / this.canvas.height);
            ctx.drawImage(this.canvas, 0, 0);
            ctx.restore();
        }
    };

    return layer.resize(width, height, pixelScale === undefined ? 1 : pixelScale);
}

// Compatibility alias promised during the first offscreen-layer migration.
// New sketches should use createCodeaLayer(), which describes the public
// coordinate contract more clearly.
function createTopLeftLayer(width, height, pixelScale) {
    return createCodeaLayer(width, height, pixelScale);
}

function drawCoordinateGuide(options) {
    var opts = options || {};
    var margin = Math.max(16, Math.min(WIDTH, HEIGHT) * 0.035);
    var touch = C.lastTouch;

    pushStyle();
    blendMode(NORMAL);

    noFill();
    stroke(255, 151, 103, 180);
    strokeWidth(1.5);
    line(0, 0, WIDTH, 0);
    line(0, HEIGHT, WIDTH, HEIGHT);

    stroke(100, 212, 238, 180);
    line(0, 0, 0, HEIGHT);
    line(WIDTH, 0, WIDTH, HEIGHT);

    noStroke();
    fill(255, 151, 103, 220);
    ellipse(margin, margin, 9, 9);
    fill(100, 212, 238, 220);
    ellipse(margin, HEIGHT - margin, 9, 9);

    textAlign(LEFT);
    textSize(12);
    fill(255, 237, 225, 230);
    text("(0, 0)", margin + 9, margin + 3);
    fill(218, 247, 255, 230);
    text("(0, HEIGHT)", margin + 9, HEIGHT - margin - 3);

    if (touch && opts.showTouch !== false) {
        noFill();
        stroke(255, 242, 130, 220);
        strokeWidth(2);
        ellipse(touch.x, touch.y, 28, 28);
        line(touch.x - 18, touch.y, touch.x + 18, touch.y);
        line(touch.x, touch.y - 18, touch.x, touch.y + 18);

        noStroke();
        fill(255, 249, 201, 235);
        textAlign(LEFT);
        textSize(12);
        var labelX = Math.min(Math.max(8, touch.x + 16), Math.max(8, WIDTH - 120));
        var labelY = Math.min(Math.max(14, touch.y + 18), Math.max(14, HEIGHT - 14));
        text("x:" + Math.round(touch.x) + "  y:" + Math.round(touch.y), labelX, labelY);
    }

    if (opts.label) {
        noStroke();
        fill(255, 255, 255, 190);
        textAlign(CENTER);
        textSize(12);
        text(String(opts.label), WIDTH * 0.5, HEIGHT - margin - 2);
    }

    popStyle();
}

function pushClip(x, y, w, h) {
    const ctx = C.ctx;

    ctx.save();

    ctx.beginPath();

    ctx.rect(
        x,
        y,
        w,
        h
    );

    ctx.clip();

    C.clipDepth += 1;
    C.clipActive = true;
}

function popClip() {
    if (C.clipDepth <= 0) {
        return false;
    }

    C.ctx.restore();

    C.clipDepth -= 1;

    C.clipActive =
        C.clipDepth > 0;

    return true;
}

function withClip(
    x,
    y,
    w,
    h,
    drawFunction
) {
    if (
        typeof drawFunction !== "function"
    ) {
        return;
    }

    pushClip(
        x,
        y,
        w,
        h
    );

    try {
        return drawFunction();
    } finally {
        popClip();
    }
}


  // Codea-style clip(x, y, w, h). Calling clip() with no arguments
  // restores the drawing state from before the active clip.
  function clip(x, y, w, h) {
    if (arguments.length === 0) {
        popClip();
        return;
    }

    if (C.clipDepth > 0) {
        popClip();
    }

    pushClip(
        x,
        y,
        w,
        h
    );
}


  function bounceOut(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      t -= 1.5 / d1;
      return n1 * t * t + 0.75;
    }
    if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return n1 * t * t + 0.9375;
    }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  }

  function tween(duration, subject, target, easing = tween.easing.linear, callback) {
    if (!subject || !target) {
      throw new TypeError("tween(duration, subject, target, ...) requires subject and target objects");
    }

    const startValues = {};
    const endValues = {};

    for (const [key, value] of Object.entries(target)) {
      if (typeof value !== "number") continue;
      startValues[key] = Number(subject[key] ?? 0);
      endValues[key] = value;
    }

    const item = {
      duration: Math.max(0.000001, Number(duration) || 0.000001),
      elapsed: 0,
      subject,
      startValues,
      endValues,
      easing: typeof easing === "function" ? easing : tween.easing.linear,
      callback: typeof callback === "function" ? callback : null,
      cancelled: false,
    };

    C.tweens.add(item);
    return item;
  }

  tween.stop = function stopTween(item) {
    if (!item) return;
    item.cancelled = true;
    C.tweens.delete(item);
  };

  tween.stopAll = function stopAllTweens() {
    C.tweens.clear();
  };

  tween.easing = {
    linear: (t) => t,
    quadIn: (t) => t * t,
    quadOut: (t) => 1 - (1 - t) * (1 - t),
    quadInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    bounceOut,
    bounceInOut: (t) => t < 0.5
      ? (1 - bounceOut(1 - 2 * t)) / 2
      : (1 + bounceOut(2 * t - 1)) / 2,
  };

  function updateTweens(dt) {
    for (const item of Array.from(C.tweens)) {
      if (item.cancelled) {
        C.tweens.delete(item);
        continue;
      }

      item.elapsed += dt;
      const t = clamp(item.elapsed / item.duration, 0, 1);
      const eased = item.easing(t);

      for (const key of Object.keys(item.endValues)) {
        const start = item.startValues[key];
        const end = item.endValues[key];
        item.subject[key] = start + (end - start) * eased;
      }

      if (t >= 1) {
        C.tweens.delete(item);
        if (item.callback) item.callback();
      }
    }
  }

  function random(a, b) {
    if (a === undefined) return Math.random();
    if (b === undefined) return Math.random() * a;
    return a + Math.random() * (b - a);
  }

  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function pointerPos(e) {
    const rect = C.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: C.height - (e.clientY - rect.top),
    };
  }

  function emitTouch(e, state) {
    if (typeof window.touched !== "function") return;

    const pos = pointerPos(e);
    const prev = C.pointers.get(e.pointerId) || pos;

    const t = {
      id: e.pointerId,
      x: pos.x,
      y: pos.y,
      prevX: prev.x,
      prevY: prev.y,
      deltaX: pos.x - prev.x,
      deltaY: pos.y - prev.y,
      state,
    };

    C.lastTouch = { x: pos.x, y: pos.y, state: state };

    if (state === BEGAN || state === MOVING) {
      C.pointers.set(e.pointerId, pos);
    } else {
      C.pointers.delete(e.pointerId);
    }

    window.touched(t);
  }

  function installInput() {
    const canvas = C.canvas;

    const prevent = (e) => {
      e.preventDefault();
    };

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      prevent(e);
      emitTouch(e, BEGAN);
    }, { passive: false });

    canvas.addEventListener("pointermove", (e) => {
      prevent(e);
      emitTouch(e, MOVING);
    }, { passive: false });

    canvas.addEventListener("pointerup", (e) => {
      prevent(e);
      emitTouch(e, ENDED);
    }, { passive: false });

    canvas.addEventListener("pointercancel", (e) => {
      prevent(e);
      emitTouch(e, CANCELLED);
    }, { passive: false });

    document.addEventListener("touchmove", prevent, { passive: false });
  }

  function frame(now) {
    if (!C.started) {
        return;
    }

    const sec =
        now / 1000;

    C.deltaTime =
        C.lastTime
            ? Math.min(
                0.05,
                sec - C.lastTime
            )
            : 1 / 60;

    C.elapsedTime =
        sec - C.startTime;

    C.lastTime =
        sec;

    while (C.clipDepth > 0) {
        popClip();
    }

    C.clipActive = false;

    resetTransform();

    updateTweens(
        C.deltaTime
    );

    if (
        typeof window.draw ===
        "function"
    ) {
        window.draw();
    } else {
        background(
            241,
            241,
            244
        );
    }

    requestAnimationFrame(
        frame
    );
}


  function start(canvasId) {
    C.canvas = document.getElementById(canvasId);
    C.ctx = C.canvas.getContext("2d");

    resize();
    installInput();

    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 100));

    C.startTime = performance.now() / 1000;
    C.lastTime = 0;
    C.started = true;

    if (typeof window.setup === "function") {
      window.setup();
    }

    requestAnimationFrame(frame);
  }

Object.assign(window, {
    ROUND,
    SQUARE,
    PROJECT,
    BEVEL,
    MITER,
    NORMAL,
    ADDITIVE,
    strokeCap,
    strokeJoin,
    font,
    pushStyle,
    popStyle,
    blendMode,
    noise,
    noiseSeed,
    withCanvasContext,
    createCodeaLayer,
    createTopLeftLayer,
    drawCoordinateGuide,
    pushClip,
    popClip,
    withClip,
});


  Object.defineProperties(window, {
    WIDTH: { get: () => C.width },
    HEIGHT: { get: () => C.height },
    DeltaTime: { get: () => C.deltaTime },
    ElapsedTime: { get: () => C.elapsedTime },
  });

  Object.assign(window, {
    CodeaLite: {
      start,
      state: C,
      createCodeaLayer,
      createTopLeftLayer,
      drawCoordinateGuide
    },
    BEGAN,
    MOVING,
    CHANGED,
    ENDED,
    CANCELLED,
    CORNER,
    CENTER,
    LEFT,
    RIGHT,

    color,
    vec2,
    Vec2,

    background,
    fill,
    noFill,
    stroke,
    noStroke,
    strokeWidth,
    rectMode,
    ellipseMode,
    rect,
    ellipse,
    line,
    text,
    textSize,
    fontSize,
    textAlign,

    pushMatrix,
    popMatrix,
    translate,
    rotate,
    scale,
    clip,
    tween,

    random,
    map,
    dist,
    lerp,
  });
})();
