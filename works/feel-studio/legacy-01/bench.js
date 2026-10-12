(function (root) {
  'use strict';
  const STEP = 1 / 120;
  class Bench {
    constructor(width, height, session, notify = () => {}) {
      this.session = session; this.entry = session.entry; this.notify = notify;
      this.width = width; this.height = height; this.editing = false; this.mode = 'live';
      this.input = { active: false, x: 0, y: 0 }; this.pointerId = null;
      this.frames = []; this.cursor = 0; this.waiting = false; this.handle = null;
      this.load();
    }
    resize(width, height) { this.width = width; this.height = height; this.clearTouches(); }
    transform() {
      const scale = Math.min(this.width / this.entry.width, this.height / this.entry.height);
      return { scale, x: (this.width - this.entry.width * scale) / 2, y: (this.height - this.entry.height * scale) / 2 };
    }
    point(x, y) {
      const t = this.transform();
      return { x: Math.max(0, Math.min(this.entry.width, (x - t.x) / t.scale)),
        y: Math.max(0, Math.min(this.entry.height, (y - t.y) / t.scale)) };
    }
    load() {
      this.input = { active: false, x: 0, y: 0 }; this.pointerId = null; this.handle = null; this.cursor = 0;
      this.spec = this.session.spec();
      if (this.mode === 'replay' && this.session.tape) this.spec.world = JSON.parse(JSON.stringify(this.session.tape.sourceSpec.world));
      this.model = this.entry.create(this.spec);
    }
    reset() { if (this.mode === 'record') this.finishRecord(); this.load(); }
    setEditing(editing) {
      if (this.mode === 'record') this.finishRecord();
      this.mode = 'live'; this.editing = editing; this.load(); this.notify('mode');
    }
    record() {
      this.editing = false; this.mode = 'record'; this.frames = []; this.waiting = true; this.load();
      this.sourceSpec = JSON.parse(JSON.stringify(this.spec)); this.sourceId = this.session.selectedId;
      this.notify('mode');
    }
    finishRecord() {
      if (this.mode !== 'record') return;
      this.mode = 'live'; this.waiting = false;
      if (this.frames.length) {
        this.session.setTape({ prototypeId: this.entry.id, prototypeVersion: this.entry.version,
          step: STEP, sourceId: this.sourceId, sourceSpec: this.sourceSpec, frames: this.frames });
      }
      this.notify('recorded');
    }
    replay() {
      if (!this.session.tape) return false;
      if (this.mode === 'record') this.finishRecord();
      this.mode = 'replay'; this.editing = false; this.load(); this.notify('mode'); return true;
    }
    live() {
      if (this.mode === 'record') this.finishRecord();
      this.mode = 'live'; this.load(); this.notify('mode');
    }
    pointer(event) {
      if (this.mode === 'replay') return;
      if (event.type === 'down') {
        if (this.pointerId !== null) return;
        this.pointerId = event.id;
        const point = this.point(event.x, event.y);
        if (this.editing) {
          const t = this.transform(), radius = Math.max(40, 23 / t.scale);
          const candidates = this.entry.handles(this.spec).map(h => ({ h, distance: Math.hypot(h.x - point.x, h.y - point.y) }));
          candidates.sort((a, b) => a.distance - b.distance);
          this.handle = candidates[0]?.distance <= radius ? candidates[0].h.id : null;
          if (this.handle !== null) this.session.checkpoint();
        } else { this.input = { active: true, ...point }; this.waiting = false; }
      } else if (event.id !== this.pointerId) return;
      if (event.type === 'move') {
        const point = this.point(event.x, event.y);
        if (this.editing && this.handle !== null) {
          this.session.setSpec(this.entry.edit(this.session.spec(), this.handle, point));
          this.spec = this.session.spec(); this.model = this.entry.create(this.spec); this.notify('edited');
        } else if (!this.editing) this.input = { active: true, ...point };
      }
      if (event.type === 'up' || event.type === 'cancel') {
        this.input.active = false;
        if (this.editing && this.handle !== null) { this.session.persist(); this.notify('edit-end'); }
        this.pointerId = null; this.handle = null;
        if (event.type === 'cancel' && this.mode === 'record') this.finishRecord();
      }
    }
    clearTouches() {
      if (this.editing && this.handle !== null) this.session.persist();
      this.input.active = false; this.pointerId = null; this.handle = null;
      if (this.mode === 'record' && !this.waiting) this.finishRecord();
    }
    update(dt) {
      if (this.editing || (this.mode === 'record' && this.waiting)) return;
      if (this.mode === 'replay') {
        if (this.cursor >= this.session.tape.frames.length) return;
        this.input = { ...this.session.tape.frames[this.cursor++] };
        this.model.step(dt, this.input);
        if (this.cursor === this.session.tape.frames.length) { this.input.active = false; this.notify('replayed'); }
      } else {
        this.model.step(dt, this.input);
        if (this.mode === 'record') {
          this.frames.push({ ...this.input });
          if (this.frames.length >= 720) this.finishRecord();
        }
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#344b41'; ctx.fillRect(0, 0, this.width, this.height);
      const t = this.transform(); ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.scale, t.scale);
      this.entry.draw(ctx, this.model, this.spec, { edit: this.editing, input: this.input });
      if (this.mode === 'replay' && this.session.tape) {
        ctx.strokeStyle = 'rgba(206,212,181,.27)'; ctx.lineWidth = 2; ctx.beginPath();
        let pen = false;
        for (let i = 0; i < this.session.tape.frames.length; i += 5) {
          const p = this.session.tape.frames[i];
          if (!p.active) { pen = false; continue; }
          if (!pen) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          pen = true;
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    dispose() { this.clearTouches(); }
  }
  const api = { Bench };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeelBench = api;
})(typeof window !== 'undefined' ? window : globalThis);
