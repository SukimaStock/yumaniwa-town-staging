(function (root) {
  'use strict';
  const STEP = 1 / 120;
  class Runner {
    constructor(canvas, options = {}) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      if (!this.ctx) throw new Error('このブラウザーでは実験台を描画できません。');
      this.host = options.host || root; this.doc = options.document || root.document;
      this.onError = options.onError || (() => {}); this.listeners = []; this.pointers = new Map();
      this.model = null; this.parameters = {}; this.frame = null; this.accumulator = 0; this.lastTime = null; this.hidden = !!this.doc.hidden; this.destroyed = false;
      this.bind(canvas, 'pointerdown', e => this.input(e, 'down'));
      this.bind(canvas, 'pointermove', e => this.input(e, 'move'));
      this.bind(canvas, 'pointerup', e => this.input(e, 'up'));
      this.bind(canvas, 'pointercancel', e => this.input(e, 'cancel'));
      this.bind(canvas, 'lostpointercapture', e => this.input(e, 'cancel'));
      this.bind(this.doc, 'visibilitychange', () => this.suspend(!!this.doc.hidden));
      this.bind(this.host, 'pagehide', () => this.suspend(true));
      this.bind(this.host, 'pageshow', () => this.suspend(!!this.doc.hidden));
      this.bind(this.host, 'blur', () => this.clearInput());
      this.bind(this.host, 'resize', () => this.resize());
      if (this.host.ResizeObserver) { this.observer = new this.host.ResizeObserver(() => this.resize()); this.observer.observe(canvas); }
      this.resize(); this.tick = this.tick.bind(this);
    }
    bind(target, name, fn) { target.addEventListener(name, fn); this.listeners.push(() => target.removeEventListener(name, fn)); }
    resize() {
      const r = this.canvas.getBoundingClientRect(), width = Math.max(1, r.width), height = Math.max(1, r.height), dpr = Math.min(2, this.host.devicePixelRatio || 1);
      if (width === this.width && height === this.height && dpr === this.dpr) return;
      this.clearInput(); this.lastTime = null; this.accumulator = 0;
      this.width = width; this.height = height; this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
      this.model?.resize(width, height);
    }
    input(e, type) {
      if (!this.model || this.hidden || this.destroyed) return;
      if (type !== 'down' && !this.pointers.has(e.pointerId)) return;
      if (type === 'down' && ((e.pointerType === 'mouse' && e.button !== 0) || this.pointers.size >= 10)) return;
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(this.width, (e.clientX - r.left) * this.width / Math.max(1, r.width)));
      const y = Math.max(0, Math.min(this.height, (e.clientY - r.top) * this.height / Math.max(1, r.height)));
      if (type === 'down') {
        this.canvas.focus?.({ preventScroll: true }); this.pointers.set(e.pointerId, true);
        try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* pointer may already be cancelled */ }
        if (this.id === 'slime' && e.pointerType === 'mouse' && e.shiftKey) this.model.pointer({ id: 'anchor', type: 'down', x, y }, this.parameters);
      }
      this.model.pointer({ id: e.pointerId, type, x, y, shiftKey: e.shiftKey }, this.parameters);
      if (type === 'up' || type === 'cancel') {
        this.pointers.delete(e.pointerId);
        if (this.id === 'slime' && e.pointerType === 'mouse') this.model.pointer({ id: 'anchor', type }, this.parameters);
        try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
      }
    }
    clearInput() {
      const ids = [...this.pointers.keys()]; this.pointers.clear(); this.model?.clearTouches();
      for (const id of ids) { try { this.canvas.releasePointerCapture(id); } catch (_) { /* inactive capture */ } }
    }
    suspend(hidden) { this.hidden = hidden; this.clearInput(); this.lastTime = null; this.accumulator = 0; }
    select(id, Model, parameters, seed) {
      this.clearInput(); this.model?.dispose(); this.id = id; this.parameters = { ...parameters }; this.seed = seed;
      this.model = new Model(this.width, this.height, seed); this.lastTime = null; this.accumulator = 0;
    }
    setParameters(values) { this.parameters = { ...values }; }
    replay() { this.clearInput(); this.model?.reset(); this.lastTime = null; this.accumulator = 0; }
    advance(time) {
      if (this.hidden || !this.model) { this.lastTime = null; return; }
      if (this.lastTime === null) { this.lastTime = time; return; }
      const dt = Math.min(.05, Math.max(0, (time - this.lastTime) / 1000)); this.lastTime = time;
      this.accumulator += dt;
      while (this.accumulator + 1e-10 >= STEP) { this.model.update(STEP, this.parameters); this.accumulator -= STEP; }
    }
    draw() {
      const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = this.id === 'slime' ? '#192622' : this.id === 'puddle' ? '#15222d' : '#16231f'; c.fillRect(0, 0, this.width, this.height);
      c.save(); this.model?.draw(c); c.restore();
    }
    tick(time) {
      if (this.destroyed) return;
      try { this.advance(time); if (!this.hidden) this.draw(); }
      catch (error) { this.onError(error); this.suspend(true); return; }
      this.frame = this.host.requestAnimationFrame(this.tick);
    }
    start() { if (this.frame === null && !this.destroyed) this.frame = this.host.requestAnimationFrame(this.tick); }
    destroy() {
      this.destroyed = true; this.host.cancelAnimationFrame(this.frame); this.frame = null;
      this.clearInput(); this.model?.dispose(); this.observer?.disconnect(); this.listeners.splice(0).forEach(remove => remove());
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Runner, STEP };
  else root.MotionRunner = { Runner, STEP };
})(typeof window !== 'undefined' ? window : globalThis);
