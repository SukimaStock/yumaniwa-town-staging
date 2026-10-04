/* Work-local paper and hand. Only adapter callbacks commit itinerary changes. */
(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const STATES = ["CLOSED", "PEEK", "OPEN"];
  class PaperBoard {
    constructor(adapter) {
      this.a = adapter;
      this.surface = document.getElementById("board");
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
      this.cards = new Map();
      this.joins = new Map();
      this.threadLag = new Map();
      this.clock = 0;
      this.level = 1;
      this.tapDirection = 1;
      this.top = null;
      this.selected = null;
      this.slip = null;
      this.hand = null;
      this.startAt = null;
      this.stamp = null;
      this.reply = null;
      this.refreshGeometry();
      this.surface.addEventListener("pointerdown", (e) => this.down(e));
      this.surface.addEventListener("pointermove", (e) => this.move(e));
      this.surface.addEventListener("pointerup", (e) => this.up(e, false));
      this.surface.addEventListener("pointercancel", (e) => this.up(e, true));
      this.surface.addEventListener("lostpointercapture", (e) =>
        this.up(e, true),
      );
      window.addEventListener("blur", () => this.cancel());
      window.addEventListener("resize", () => {
        this.cancel();
        this.refreshGeometry();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.cancel();
      });
      this.reduced.addEventListener("change", () => this.refreshGeometry());
    }
    get editable() {
      return (
        this.a.screen() === "play" &&
        ["plan", "event", "failed"].includes(this.a.state().phase) &&
        this.startAt === null
      );
    }
    refreshGeometry() {
      const safe = document
        .getElementById("safe-probe")
        .getBoundingClientRect().height;
      this.w = innerWidth;
      this.h = innerHeight;
      this.safe = safe;
      this.paperW = Math.min(620, this.w - 16);
      this.left = (this.w - this.paperW) / 2;
      this.tops = [
        this.h - 58 - safe,
        this.h - Math.min(this.h * 0.36, 290) - safe,
        Math.max(this.h < 500 ? 140 : 160, this.h * 0.29),
      ];
      this.targetTop = this.tops[this.level];
      if (this.top === null || this.reduced.matches) this.top = this.targetTop;
      this.cols = this.w >= 700 && this.h < 500 ? 4 : 2;
      this.cw = Math.min(164, (this.paperW - 18 * (this.cols + 1)) / this.cols);
      this.ch = 54;
      this.gap = Math.min(
        78,
        Math.max(58, (this.h - this.tops[2] - safe - 136) / 4),
      );
      this.sync();
    }
    reset() {
      this.cancel();
      this.cards.clear();
      this.joins.clear();
      this.threadLag.clear();
      this.selected = null;
      this.slip = null;
      this.reply = null;
      this.startAt = null;
      this.stamp = null;
      this.level = 1;
      this.tapDirection = 1;
      this.top = this.tops[1];
      this.targetTop = this.top;
      this.sync();
    }
    sheet(level) {
      this.level = clamp(level, 0, 2);
      this.targetTop = this.tops[this.level];
      if (this.reduced.matches) this.top = this.targetTop;
      this.a.announce("手帳 " + STATES[this.level]);
      this.syncDOM();
    }
    cycle() {
      if (this.level === 0) this.tapDirection = 1;
      if (this.level === 2) this.tapDirection = -1;
      this.sheet(this.level + this.tapDirection);
      this.a.tone(310);
    }
    slot(i) {
      const row = Math.floor(i / this.cols),
        col = row % 2 ? this.cols - 1 - (i % this.cols) : i % this.cols;
      return {
        x: this.left + 18 + this.cw / 2 + col * (this.cw + 18),
        y: this.top + 98 + row * this.gap,
      };
    }
    origin() {
      return this.slot(0);
    }
    tail() {
      return { x: this.left + this.paperW - 82, y: this.h - this.safe - 35 };
    }
    sync() {
      const s = this.a.state();
      // Acquired slips and pending connected cards are visual objects. Completed
      // route nodes leave the paper; their record remains in the original model.
      for (const [id] of this.cards)
        if (s.at === id && !s.route.includes(id)) this.cards.delete(id);
      for (const id of s.route)
        if (!this.cards.has(id)) {
          const p = this.slot(s.route.indexOf(id) + 1);
          this.cards.set(id, { ...p, tx: p.x, ty: p.y });
        }
      const order = this.previewOrder || s.route;
      for (const [id, c] of this.cards) {
        const i = order.indexOf(id);
        if (i >= 0 && this.hand?.id !== id) {
          const p =
            c.manual && !this.previewOrder
              ? { x: this.left + c.manual.x, y: this.top + c.manual.y }
              : this.slot(i + 1);
          c.tx = clamp(
            p.x,
            this.left + this.cw / 2 + 8,
            this.left + this.paperW - this.cw / 2 - 8,
          );
          c.ty = p.y;
        } else if (i < 0 && this.hand?.id !== id) {
          c.ly ??= c.ty - this.top;
          c.ty = this.top + c.ly;
        }
      }
      const active = new Set();
      let from = s.at;
      for (const id of s.route) {
        const key = from + ":" + id;
        active.add(key);
        if (!this.joins.has(key)) this.joins.set(key, this.clock);
        from = id;
      }
      for (const key of this.joins.keys())
        if (!active.has(key)) this.joins.delete(key);
      this.syncDOM();
    }
    syncDOM() {
      this.surface.dataset.notebook = STATES[this.level];
      this.surface.dataset.drag = this.hand?.kind || "";
      this.surface.dataset.preview = this.hand?.candidate?.id || "";
      this.surface.dataset.tension = this.hand?.breakReady ? "ready" : "";
      this.surface.dataset.connections = this.a.state().route.join(",");
      document.getElementById("desk").style.top = this.top + "px";
      document.getElementById("desk").dataset.notebook = STATES[this.level];
      this.projectObjects();
    }
    projectObjects() {
      const root = document.getElementById("objects");
      if (!root) return;
      const objects = [];
      if (this.a.screen() === "play" && this.a.state().phase !== "success") {
        objects.push({
          key: "paper",
          action: "paper",
          label: "紙の端・手帳をめくる",
          x: this.left,
          y: this.top,
          w: this.paperW,
          h: 48,
        });
        if (this.editable && this.level !== 0) {
          const o = this.origin();
          objects.push({
            key: "origin",
            action: "object-origin",
            label: "いまの場所へ糸を結ぶ",
            x: o.x - this.cw / 2,
            y: o.y - this.ch / 2,
            w: this.cw,
            h: this.ch,
          });
          for (const [id, c] of this.cards)
            if (
              c.y - this.ch / 2 > this.top + 48 &&
              c.y + this.ch / 2 < this.h - this.safe - 58
            )
              objects.push({
                key: "card-" + id,
                action: "object-card",
                id,
                label: this.a.node(id).name + "の紙片を選ぶ",
                x: c.x - this.cw / 2,
                y: c.y - this.ch / 2,
                w: this.cw,
                h: this.ch,
              });
          const tail = this.tail();
          if (this.a.state().route.length)
            objects.push({
              key: "start",
              action: "start",
              label: "糸の端・出発する",
              x: tail.x - 25,
              y: tail.y - 24,
              w: 50,
              h: 48,
            });
          const knot = this.selectedKnot();
          if (knot)
            objects.push({
              key: "knot",
              action: "remove",
              id: this.selected,
              label: "選んだカードの糸をほどく",
              x: knot.x - 22,
              y: knot.y - 22,
              w: 44,
              h: 44,
            });
        }
        const sp = this.slipPoint();
        if (sp)
          objects.push({
            key: "slip",
            action: "object-slip",
            id: this.slip,
            label: this.a.node(this.slip).name + "の札を手帳へ持つ",
            x: sp.x - 83,
            y: sp.y - 31,
            w: 166,
            h: 62,
          });
      }
      const keys = new Set(objects.map((o) => o.key));
      for (const el of [...root.children])
        if (!keys.has(el.dataset.object)) el.remove();
      for (const o of objects) {
        let el = root.querySelector(`[data-object="${o.key}"]`);
        if (!el) {
          el = document.createElement("button");
          el.className = "board-object";
          el.dataset.object = o.key;
          root.append(el);
        }
        el.dataset.action = o.action;
        el.dataset.id = o.id || "";
        el.setAttribute("aria-label", o.label);
        Object.assign(el.style, {
          left: o.x + "px",
          top: o.y + "px",
          width: o.w + "px",
          height: o.h + "px",
        });
      }
    }
    tapObject(kind, id) {
      if (kind === "slip" && this.slip) {
        this.sheet(2);
        this.acquire(this.slip, this.slot(this.a.state().route.length + 1));
      }
      if (kind === "origin" && this.selected)
        this.connect(this.selected, this.a.state().at);
      if (kind === "card") {
        if (this.selected && this.selected !== id) {
          this.connect(this.selected, id);
          this.selected = null;
        } else this.selected = this.selected === id ? null : id;
      }
      this.a.note(this.selected);
      this.sync();
      this.a.refreshFallback();
    }
    inspect(id) {
      if (!this.editable) return;
      this.reply = { id, at: this.clock };
      this.slip = id;
      if (this.level === 2) this.sheet(1);
      this.a.inspect(id);
      this.selected = id;
    }
    slipPoint() {
      if (!this.slip) return null;
      const p = this.a.place(this.slip);
      return {
        x: clamp(p.x, 90, this.w - 90),
        y: clamp(p.y - 62, 170, this.top - 46),
      };
    }
    acquire(id, p) {
      if (!this.cards.has(id))
        this.cards.set(id, { ...p, tx: p.x, ty: p.y, ly: p.y - this.top });
      this.slip = null;
      this.a.note(null);
      this.selected = id;
      this.sync();
    }
    normalize() {
      for (const c of this.cards.values()) delete c.manual;
    }
    connect(id, after) {
      if (!this.editable || id === after) return;
      if (this.a.connect(id, after) === false) return;
      this.normalize();
      this.previewOrder = null;
      this.sync();
      this.a.tone(460);
      this.a.announce(this.a.node(id).name + "を結んだ");
    }
    disconnect(id) {
      if (!this.editable) return;
      this.a.disconnect(id);
      this.previewOrder = null;
      this.sync();
      this.a.tone(250);
      this.a.announce(this.a.node(id).name + "の糸をほどいた");
    }
    hit(p) {
      if (this.a.screen() !== "play" || this.a.state().phase === "success")
        return null;
      const sp = this.slipPoint();
      if (sp && Math.abs(p.x - sp.x) < 83 && Math.abs(p.y - sp.y) < 33)
        return { kind: "slip", id: this.slip, point: sp };
      if (
        p.y >= this.top &&
        p.x >= this.left &&
        p.x <= this.left + this.paperW
      ) {
        if (p.y < this.top + 48) return { kind: "paper" };
        if (!this.editable || this.level === 0) return null;
        const tail = this.tail();
        if (this.a.state().route.length && distance(p, tail) < 28)
          return { kind: "start", point: tail };
        const knot = this.selectedKnot();
        if (knot && distance(p, knot) < 24)
          return { kind: "knot", id: this.selected };
        for (const [id, c] of [...this.cards].reverse()) {
          if (
            Math.abs(p.x - c.x) <= this.cw / 2 &&
            Math.abs(p.y - c.y) <= this.ch / 2
          )
            return { kind: "card", id, point: c };
        }
        if (distance(p, this.origin()) < this.cw / 2)
          return { kind: "origin", id: this.a.state().at };
        return { kind: "paper-space" };
      }
      if (!this.editable) return null;
      const id = this.a.hitPlace(p);
      return id ? { kind: "place", id } : { kind: "empty" };
    }
    selectedKnot() {
      const c = this.cards.get(this.selected);
      return c && this.a.state().route.includes(this.selected)
        ? { x: c.x + this.cw / 2 - 12, y: c.y + this.ch / 2 + 13 }
        : null;
    }
    down(e) {
      // A second finger never steals ownership. Cancel rather than commit a
      // partial gesture if the browser elects to cancel its primary pointer.
      if (this.hand || e.button !== 0 || e.isPrimary === false) return;
      const p = { x: e.clientX, y: e.clientY },
        hit = this.hit(p);
      if (!hit) return;
      e.preventDefault();
      this.hand = {
        ...hit,
        pointer: e.pointerId,
        start: p,
        p: p,
        last: p,
        lastAt: e.timeStamp,
        velocity: 0,
        started: e.timeStamp,
        top: this.top,
        moved: false,
        offset: hit.point
          ? { x: p.x - hit.point.x, y: p.y - hit.point.y }
          : { x: 0, y: 0 },
        original: hit.point ? { x: hit.point.x, y: hit.point.y } : null,
      };
      this.surface.setPointerCapture(e.pointerId);
      if (hit.kind === "card" || hit.kind === "slip") this.a.tone(330);
      this.syncDOM();
    }
    move(e) {
      const d = this.hand;
      if (!d || d.pointer !== e.pointerId) return;
      e.preventDefault();
      const p = { x: e.clientX, y: e.clientY };
      d.velocity = (p.y - d.last.y) / Math.max(1, e.timeStamp - d.lastAt);
      d.last = p;
      d.lastAt = e.timeStamp;
      d.p = p;
      if (distance(p, d.start) > 7) d.moved = true;
      if (!d.moved) return;
      if (d.kind === "paper") {
        this.top = clamp(
          d.top + p.y - d.start.y,
          this.tops[2] - 8,
          this.tops[0] + 8,
        );
        this.sync();
        return;
      }
      if (d.kind === "start") {
        d.pull = clamp(p.x - d.start.x, 0, 65);
        this.syncDOM();
        return;
      }
      if (!["card", "slip"].includes(d.kind) || !this.editable) return;
      if (d.kind === "slip" && p.y > this.top - 40 && this.level < 2)
        this.sheet(2);
      const v = {
        x: clamp(
          p.x - d.offset.x,
          this.left + this.cw / 2 + 4,
          this.left + this.paperW - this.cw / 2 - 4,
        ),
        y: p.y - d.offset.y - 3,
      };
      d.visual = v;
      d.candidate = this.candidate(d.id, v);
      if (d.candidate && d.candidate.distance < 24) {
        const t = 1 - d.candidate.distance / 24;
        v.x += (d.candidate.drop.x - v.x) * t * 0.75;
        v.y += (d.candidate.drop.y - v.y) * t * 0.75;
        if (!d.snapped) this.a.tone(430);
        d.snapped = true;
      } else d.snapped = false;
      // Preview a new order without touching the model. Neighbours yield to it.
      if (d.candidate) {
        const order = this.a.state().route.filter((id) => id !== d.id);
        const i =
          d.candidate.id === this.a.state().at
            ? 0
            : order.indexOf(d.candidate.id) + 1;
        order.splice(i, 0, d.id);
        this.previewOrder = order;
      } else this.previewOrder = null;
      const outside = v.y < this.top + 55;
      if (
        d.kind === "card" &&
        this.a.state().route.includes(d.id) &&
        outside &&
        distance(v, d.original) > 95 &&
        !d.candidate
      ) {
        d.tensionAt ??= performance.now();
        d.breakReady = performance.now() - d.tensionAt >= 140;
      } else {
        d.tensionAt = null;
        d.breakReady = false;
      }
      this.sync();
    }
    candidate(id, p) {
      if (p.y < this.top + 48) return null;
      const s = this.a.state(),
        targets = [
          { id: s.at, ...this.origin() },
          ...[...this.cards]
            .filter(([x]) => x !== id)
            .map(([x, c]) => {
              const i = s.route.indexOf(x);
              return {
                id: x,
                ...(i >= 0
                  ? c.manual
                    ? { x: this.left + c.manual.x, y: this.top + c.manual.y }
                    : this.slot(i + 1)
                  : { x: c.tx, y: c.ty }),
              };
            }),
        ];
      let best = null;
      for (const t of targets) {
        if (!Number.isFinite(t.x)) continue;
        // Grasp at the centre; settle beside the next card, leaving a small seam.
        const drop = { x: t.x, y: t.y + this.ch + 12 };
        const dist = distance(p, drop);
        if (dist < 64 && (!best || dist < best.distance))
          best = { id: t.id, distance: dist, drop };
      }
      return best;
    }
    up(e, cancelled) {
      const d = this.hand;
      if (!d || e.pointerId !== d.pointer) return;
      this.hand = null;
      this.previewOrder = null;
      if (this.surface.hasPointerCapture(e.pointerId))
        this.surface.releasePointerCapture(e.pointerId);
      if (cancelled) {
        if (d.kind === "paper") this.sheet(this.level);
        this.sync();
        return;
      }
      if (d.kind === "card" && d.moved && d.visual) {
        const c = this.cards.get(d.id);
        if (c) {
          c.x = d.visual.x;
          c.y = d.visual.y;
        }
      }
      if (d.kind === "paper") {
        if (!d.moved) this.cycle();
        else {
          const fresh = e.timeStamp - d.lastAt < 100;
          const projected =
            this.top +
            (fresh && Math.abs(d.velocity) > 0.45
              ? clamp(d.velocity, -1.4, 1.4) * 90
              : 0);
          const level = this.tops.reduce(
            (best, y, i) =>
              Math.abs(projected - y) < Math.abs(projected - this.tops[best])
                ? i
                : best,
            0,
          );
          this.sheet(level);
          this.a.tone(310);
        }
      } else if (d.kind === "place" && !d.moved) this.inspect(d.id);
      else if (d.kind === "start") {
        if (!d.moved || d.pull >= 44) this.depart();
      } else if (d.kind === "knot" && !d.moved) this.disconnect(d.id);
      else if (d.kind === "origin" && !d.moved && this.selected)
        this.connect(this.selected, d.id);
      else if (["card", "slip"].includes(d.kind)) {
        if (!d.moved) {
          if (d.kind === "slip") {
            this.sheet(2);
            this.acquire(d.id, this.slot(this.a.state().route.length + 1));
            // Tap alternative: select a slip, then tap the current place / card.
          } else if (this.selected && this.selected !== d.id) {
            this.connect(this.selected, d.id);
            this.selected = null;
            this.a.note(null);
          } else {
            this.selected = this.selected === d.id ? null : d.id;
            this.a.note(this.selected);
          }
        } else if (this.editable) {
          const v = d.visual || d.original;
          const ready =
            d.tensionAt !== null &&
            d.tensionAt !== undefined &&
            performance.now() - d.tensionAt >= 140;
          if (ready && !d.candidate) {
            this.disconnect(d.id);
            const c = this.cards.get(d.id);
            if (c) {
              c.tx = clamp(
                v.x,
                this.left + this.cw / 2 + 8,
                this.left + this.paperW - this.cw / 2 - 8,
              );
              c.ty = this.top + 98 + 3 * this.gap;
              c.ly = c.ty - this.top;
            }
          } else if (d.candidate && d.candidate.distance <= 30) {
            if (d.kind === "slip") this.acquire(d.id, v);
            this.connect(d.id, d.candidate.id);
            this.selected = d.id;
          } else if (v.y >= this.top + 48 && v.y < this.h - this.safe - 58) {
            if (d.kind === "slip") this.acquire(d.id, v);
            const c = this.cards.get(d.id);
            if (c) {
              c.tx = v.x;
              c.ty = clamp(v.y, this.top + 75, this.h - this.safe - 85);
              c.ly = c.ty - this.top;
              if (this.a.state().route.includes(d.id))
                c.manual = { x: c.tx - this.left, y: c.ly };
            }
          }
        }
      } else if (!d.moved && ["empty", "paper-space"].includes(d.kind)) {
        this.selected = null;
        this.slip = null;
        this.a.note(null);
      }
      this.sync();
      this.a.refreshFallback();
    }
    cancel() {
      if (this.hand)
        this.up(
          { pointerId: this.hand.pointer, timeStamp: performance.now() },
          true,
        );
    }
    depart() {
      if (!this.editable || !this.a.state().route.length) return;
      this.startAt = this.clock + 0.08;
      this.stamp = {
        at: this.a.state().now,
        label: this.a.state().event ? "RESUME" : "START",
      };
      this.slip = null;
      this.selected = null;
      this.a.note(null);
      this.a.tone(270);
      this.sheet(1);
    }
    update(dt) {
      this.clock += dt;
      if (this.startAt !== null && this.clock + 1e-9 >= this.startAt) {
        this.startAt = null;
        this.a.depart();
      }
      const ease = this.reduced.matches ? 1 : 1 - Math.exp(-dt / 0.065);
      if (this.hand?.kind !== "paper")
        this.top += (this.targetTop - this.top) * ease;
      for (const c of this.cards.values()) {
        c.x += (c.tx - c.x) * ease;
        c.y += (c.ty - c.y) * ease;
      }
      const points = new Map([
        [this.a.state().at, this.origin()],
        ...[...this.cards].map(([id, c]) => [
          id,
          this.hand?.id === id && this.hand.moved ? this.hand.visual : c,
        ]),
      ]);
      const trail = this.reduced.matches ? 1 : 1 - Math.exp(-dt / 0.09);
      for (const [id, p] of points) {
        if (!p) continue;
        const lag = this.threadLag.get(id) || { x: p.x, y: p.y };
        lag.x += (p.x - lag.x) * trail;
        lag.y += (p.y - lag.y) * trail;
        this.threadLag.set(id, lag);
      }
      for (const id of this.threadLag.keys())
        if (!points.has(id)) this.threadLag.delete(id);
      if (this.hand?.tensionAt != null)
        this.hand.breakReady = performance.now() - this.hand.tensionAt >= 140;
      this.sync();
    }
    draw(ctx) {
      if (this.a.screen() !== "play" || this.a.state().phase === "success")
        return;
      const s = this.a.state(),
        d = this.hand;
      ctx.save();
      const box = (x, y, w, h, color, r = 8) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
      };
      ctx.shadowColor = "#7c786b25";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = -3;
      box(
        this.left,
        this.top,
        this.paperW,
        this.h - this.top + 16,
        "#fffaf0",
        18,
      );
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      box(this.left + this.paperW / 2 - 20, this.top + 9, 40, 3, "#c3c5b5", 2);
      ctx.font = "13px system-ui";
      ctx.textAlign = "left";
      ctx.fillStyle = "#64745f";
      ctx.fillText("つなぎめの手帳", this.left + 19, this.top + 35);
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillStyle = "#929887";
      ctx.fillText(
        this.level === 0 ? "紙の端を、ポン" : "紙の端を、上へ・下へ",
        this.left + this.paperW - 16,
        this.top + 35,
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.left, this.top + 48, this.paperW, this.h - this.top - 48);
      ctx.clip();
      for (let y = this.top + 64; y < this.h; y += 20) {
        ctx.strokeStyle = "#d8dfcc65";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(this.left + 12, y);
        ctx.lineTo(this.left + this.paperW - 12, y);
        ctx.stroke();
      }
      const point = (id) =>
        d?.id === id && d.moved && d.visual
          ? d.visual
          : id === s.at
            ? this.origin()
            : this.cards.get(id);
      const thread = (a, b, slack, progress = 1, tension = false, lag = b) => {
        if (!a || !b) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const sag = slack ? 32 : 8;
        const lerp = (p, q, t) => ({
          x: p.x + (q.x - p.x) * t,
          y: p.y + (q.y - p.y) * t,
        });
        const b1 = {
            x: a.x + (b.x - a.x) * 0.2,
            y: a.y + sag + (b.y - a.y) * 0.5,
          },
          b2 = {
            x: b.x - (b.x - a.x) * 0.2 + (lag.x - b.x) * 0.45,
            y: b.y + sag - (b.y - a.y) * 0.15 + (lag.y - b.y) * 0.45,
          };
        const p1 = lerp(a, b1, progress),
          p2 = lerp(b1, b2, progress),
          p3 = lerp(b2, b, progress),
          q1 = lerp(p1, p2, progress),
          q2 = lerp(p2, p3, progress),
          end = lerp(q1, q2, progress);
        ctx.bezierCurveTo(p1.x, p1.y, q1.x, q1.y, end.x, end.y);
        ctx.strokeStyle = tension ? "#b49576" : slack ? "#a8b29f" : "#769681";
        ctx.lineWidth = 1.9;
        ctx.lineCap = "round";
        if (slack && progress >= 1) ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.restore();
      };
      let from = s.at;
      for (const id of s.route) {
        const started = this.joins.get(from + ":" + id) ?? this.clock;
        const progress = this.reduced.matches
          ? 1
          : clamp((this.clock - started - 0.07) / 0.2, 0, 1);
        const a = point(from),
          b = point(id);
        thread(
          a,
          b,
          this.a.edge(from, id) === null ||
            (from === "lift" && id === "roof" && s.event),
          progress,
          d?.id === id && d.tensionAt != null,
          this.threadLag.get(id) || b,
        );
        if (a && b) {
          ctx.fillStyle = "#899482";
          ctx.font = "10px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(
            this.a.edge(from, id) === null
              ? "通路のメモ"
              : this.a.edge(from, id) + "分",
            (a.x + b.x) / 2 + 18,
            Math.abs(a.y - b.y) < 12
              ? a.y + this.ch / 2 + 12
              : Math.min(a.y, b.y) + this.ch / 2 + 11,
          );
        }
        from = id;
      }
      if (d?.candidate && d.visual) {
        ctx.globalAlpha = 0.5;
        thread(point(d.candidate.id), d.visual, false);
        ctx.globalAlpha = 1;
      }
      const drawCard = (id, c, origin = false) => {
        if (!c) return;
        const held = d?.id === id && d.moved;
        const pressed = d?.id === id && !d.moved;
        const x = c.x - this.cw / 2,
          y = c.y - this.ch / 2 + (pressed ? 1.5 : 0);
        ctx.save();
        ctx.shadowColor = "#72746528";
        ctx.shadowBlur = held ? 10 : 3;
        ctx.shadowOffsetY = held ? 6 : 2;
        box(x, y, this.cw, this.ch, origin ? "#f0f0e3" : "#fffdf6", 5);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        if (this.selected === id) {
          ctx.strokeStyle = "#b7a77f";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, this.cw - 4, this.ch - 4);
        }
        const n = this.a.node(id);
        ctx.textAlign = "left";
        ctx.font = "15px system-ui";
        ctx.fillStyle = "#63775f";
        ctx.fillText(n.icon, x + 9, y + 21);
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#445648";
        ctx.fillText(n.name, x + 31, y + 21, this.cw - 36);
        ctx.font = "9px system-ui";
        ctx.fillStyle = "#8b927f";
        ctx.fillText(
          origin
            ? "いま · " + this.a.time(s.now)
            : n.open
              ? this.a.time(n.open) + "から"
              : "朝のメモ",
          x + 10,
          y + 41,
        );
        ctx.fillStyle = "#72927f";
        ctx.beginPath();
        ctx.arc(c.x, c.y + this.ch / 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawCard(s.at, this.origin(), true);
      for (const [id, c] of this.cards)
        if (id !== d?.id || !d?.moved) drawCard(id, c);

      const knot = this.selectedKnot();
      if (knot && !d?.moved) {
        ctx.strokeStyle = "#b09675";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(knot.x, knot.y, 9, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "9px system-ui";
        ctx.fillStyle = "#95816b";
        ctx.textAlign = "right";
        ctx.fillText("ほどく", knot.x - 13, knot.y + 3);
      }
      if ((s.route.length && this.editable) || this.startAt !== null) {
        const last = point(s.route.at(-1)),
          tail = this.tail(),
          pull = d?.kind === "start" ? d.pull || 0 : 0;
        const end = { x: tail.x + pull, y: tail.y };
        thread(last, end, false);
        box(end.x - 17, end.y - 12, 34, 24, "#d6a87a", 5);
        ctx.fillStyle = "#fffaf0";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("→", end.x, end.y + 4);
        ctx.fillStyle = "#8c8d79";
        ctx.font = "10px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(
          s.event ? "糸の端を引いて、つづきへ" : "糸の端を引いて、出発",
          tail.x - 26,
          tail.y + 4,
        );
      }
      if (!this.cards.size && s.phase !== "running") {
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#939c88";
        ctx.textAlign = "center";
        ctx.fillText(
          "場所から札を拾い、紙の上へ。",
          this.left + this.paperW / 2,
          this.top + 178,
        );
      }
      if (d?.tensionAt != null) {
        ctx.fillStyle = "#95816b";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          d.breakReady ? "離すと、ほどける" : "もう少し引くと、ほどける",
          this.left + this.paperW / 2,
          this.top + 60,
        );
      }
      if (this.stamp) {
        ctx.save();
        ctx.translate(this.left + this.paperW - 80, this.top + 63);
        ctx.rotate(-0.06);
        ctx.strokeStyle = "#b78868";
        ctx.strokeRect(-40, -13, 80, 26);
        ctx.font = "10px system-ui";
        ctx.fillStyle = "#ac8062";
        ctx.textAlign = "center";
        ctx.fillText(this.a.time(this.stamp.at) + " " + this.stamp.label, 0, 4);
        ctx.restore();
      }
      ctx.restore();
      if (d?.kind === "card" && d.moved) drawCard(d.id, d.visual);
      const sp = this.slipPoint();
      if (sp) {
        const held = d?.kind === "slip" && d.moved,
          p = held ? d.visual : sp;
        ctx.save();
        ctx.shadowColor = "#6d6d612b";
        ctx.shadowBlur = held ? 10 : 4;
        ctx.shadowOffsetY = held ? 6 : 2;
        box(p.x - 83, p.y - 31, 166, 62, "#fffdf4", 5);
        ctx.shadowBlur = 0;
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#50654f";
        ctx.fillText(this.a.node(this.slip).name, p.x, p.y - 7);
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#8c917d";
        ctx.fillText(
          this.a.node(this.slip).open
            ? this.a.time(this.a.node(this.slip).open) + " · 札を持つ"
            : "朝の札 · 手帳へ",
          p.x,
          p.y + 14,
        );
        ctx.restore();
      }
      ctx.restore();
    }
  }
  root.MorningPaperBoard = PaperBoard;
})(window);
