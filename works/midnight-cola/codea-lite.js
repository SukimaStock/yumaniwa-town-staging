// Codea Lite for Web
// A tiny compatibility layer for moving Codea-style sketches to HTML Canvas.
// Goal: keep sketch code close to Codea: setup(), draw(), touched(touch), WIDTH, HEIGHT.

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
};


  const BEGAN = "BEGAN";
  const MOVING = "MOVING";
  const ENDED = "ENDED";
  const CANCELLED = "CANCELLED";

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

    // ゲーム内部の論理サイズは常に360×640で固定する。
    C.width = 360;
    C.height = 640;

    // 表示サイズはCSS側に任せる。PCでは360×640、
    // 小さい画面では縦横比を保ったまま縮小される。

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
    const scaleX = C.width / Math.max(1, rect.width);
    const scaleY = C.height / Math.max(1, rect.height);

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: C.height - (e.clientY - rect.top) * scaleY,
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
    strokeCap,
    strokeJoin,
    font,
    withCanvasContext,
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
    CodeaLite: { start, state: C },
    BEGAN,
    MOVING,
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
