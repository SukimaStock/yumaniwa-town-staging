"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const M = require("./model.js");
function fixture() {
  let now = 0,
    departures = 0;
  const surface = {
    dataset: {},
    addEventListener() {},
    setPointerCapture(id) {
      this.pointer = id;
    },
    hasPointerCapture(id) {
      return this.pointer === id;
    },
    releasePointerCapture() {
      this.pointer = null;
    },
  };
  const elements = {
    board: surface,
    desk: { style: {}, dataset: {} },
    "safe-probe": { getBoundingClientRect: () => ({ height: 0 }) },
  };
  const context = {
    window: { addEventListener() {} },
    document: {
      getElementById: (id) => elements[id] || null,
      addEventListener() {},
    },
    innerWidth: 390,
    innerHeight: 844,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    performance: { now: () => now },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(require.resolve("./paper-board.js"), "utf8"),
    context,
  );
  const state = M.create();
  for (const n of M.stages.home.nodes) M.discover(state, n.id);
  const board = new context.window.MorningPaperBoard({
    state: () => state,
    screen: () => "play",
    node: (id) => M.node(state, id),
    time: M.time,
    place: () => ({ x: 150, y: 240 }),
    hitPlace: () => null,
    announce() {},
    tone() {},
    note() {},
    inspect() {},
    refreshFallback() {},
    connect(id, after) {
      if (after !== state.at && !state.route.includes(after))
        M.add(state, after);
      M.add(state, id);
      const order = state.route.filter((x) => x !== id);
      const target = after === state.at ? 0 : order.indexOf(after) + 1;
      const delta = target - state.route.indexOf(id);
      for (let i = 0; i < Math.abs(delta); i++)
        M.move(state, id, Math.sign(delta));
    },
    disconnect: (id) => M.remove(state, id),
    depart() {
      departures++;
      M.start(state);
    },
  });
  const tick = (ms) => {
    now += ms;
    board.update(ms / 1000);
  };
  const event = (x, y, t = now, id = 1) => ({
    clientX: x,
    clientY: y,
    timeStamp: t,
    pointerId: id,
    isPrimary: id === 1,
    button: 0,
    preventDefault() {},
  });
  return { board, state, tick, event, departures: () => departures };
}
test("loose slips do not edit route; proximity previews and magnetic drop commits only on release", () => {
  const f = fixture(),
    b = f.board;
  b.sheet(2);
  f.tick(500);
  b.acquire("coffee", b.slot(1));
  assert.deepEqual(f.state.route, []);
  const c = b.cards.get("coffee"),
    o = b.origin();
  b.down(f.event(c.x, c.y));
  b.move(f.event(o.x, o.y + 66));
  assert.equal(b.hand.candidate.id, "table");
  assert.ok(b.hand.snapped);
  assert.deepEqual(f.state.route, []);
  b.up(f.event(o.x, o.y + 66), false);
  assert.deepEqual(f.state.route, ["coffee"]);
});
test("preview fringe cannot accidentally connect; cancelling a held card does not edit route", () => {
  const f = fixture(),
    b = f.board;
  b.sheet(2);
  f.tick(500);
  b.acquire("coffee", b.slot(1));
  const c = b.cards.get("coffee"),
    o = b.origin();
  b.down(f.event(c.x, c.y));
  b.move(f.event(o.x + 50, o.y + 66));
  assert.ok(b.hand.candidate);
  assert.ok(!b.hand.snapped);
  b.up(f.event(o.x + 50, o.y + 66), false);
  assert.deepEqual(f.state.route, []);
  b.down(f.event(c.x, c.y));
  b.move(f.event(o.x, o.y + 66));
  b.up(f.event(o.x, o.y + 66), true);
  assert.deepEqual(f.state.route, []);
  assert.equal(b.hand, null);
});
test("yielding does not move magnetic targets; loose cards can connect to each other", () => {
  const f = fixture(),
    b = f.board;
  b.sheet(2);
  f.tick(500);
  b.acquire("coffee", b.slot(1));
  b.connect("coffee", f.state.at);
  b.acquire("laundry", b.slot(2));
  b.connect("laundry", "coffee");
  f.tick(500);
  const fixed = b.slot(2),
    p = { x: fixed.x, y: fixed.y + 66 };
  const before = b.candidate("coffee", p);
  b.previewOrder = ["laundry", "coffee"];
  b.sync();
  for (let i = 0; i < 30; i++) f.tick(16);
  const after = b.candidate("coffee", p);
  assert.equal(before.id, after.id);
  assert.equal(before.drop.x, after.drop.x);
  assert.ok(Math.abs(before.drop.y - after.drop.y) < 0.001);
  b.disconnect("coffee");
  b.disconnect("laundry");
  b.connect("coffee", "laundry");
  assert.deepEqual(f.state.route, ["laundry", "coffee"]);
});
test("paper tap cycle, slow midway snap, fresh flick, and cancellation", () => {
  const f = fixture(),
    b = f.board;
  for (const level of [2, 1, 0, 1]) {
    b.cycle();
    f.tick(500);
    assert.equal(b.level, level);
  }
  let y = b.top + 20;
  b.down(f.event(200, y));
  b.move(f.event(200, 760));
  f.tick(200);
  b.up(f.event(200, 760), false);
  assert.equal(b.level, 0);
  f.tick(500);
  y = b.top + 20;
  b.down(f.event(200, y));
  b.move(f.event(200, y - 100, f.event().timeStamp + 20));
  b.up(f.event(200, y - 100, f.event().timeStamp + 25), false);
  assert.equal(b.level, 1);
  f.tick(500);
  y = b.top + 20;
  b.down(f.event(200, y));
  b.move(f.event(200, 300));
  b.up(f.event(200, 300), true);
  assert.equal(b.level, 1);
  assert.equal(b.hand, null);
});
test("tension requires distance plus a hold; reset removes paper/thread residue and pending departure", () => {
  const f = fixture(),
    b = f.board;
  b.sheet(2);
  f.tick(500);
  b.acquire("coffee", b.slot(1));
  b.connect("coffee", f.state.at);
  f.tick(500);
  let c = b.cards.get("coffee");
  b.down(f.event(c.x, c.y));
  b.move(f.event(c.x, b.top - 25));
  b.up(f.event(c.x, b.top - 25), false);
  assert.deepEqual(f.state.route, ["coffee"]);
  f.tick(500);
  c = b.cards.get("coffee");
  b.down(f.event(c.x, c.y));
  b.move(f.event(c.x, b.top - 25));
  f.tick(180);
  b.up(f.event(c.x, b.top - 25), false);
  assert.deepEqual(f.state.route, []);
  assert.ok(b.cards.has("coffee"));
  b.connect("coffee", f.state.at);
  b.depart();
  assert.equal(f.departures(), 0);
  Object.assign(f.state, M.create());
  b.reset();
  f.tick(500);
  assert.equal(f.departures(), 0);
  assert.equal(b.cards.size, 0);
  assert.equal(b.joins.size, 0);
  assert.equal(b.threadLag.size, 1);
  assert.equal(b.slip, null);
});
test("30/60/120fps settle paper/card/thread similarly and commit one departure", () => {
  const results = [30, 60, 120].map((fps) => {
    const f = fixture(),
      b = f.board;
    b.sheet(2);
    b.acquire("coffee", { x: 190, y: 700 });
    b.connect("coffee", f.state.at);
    for (let i = 0; i < fps; i++) f.tick(1000 / fps);
    const c = b.cards.get("coffee"),
      lag = b.threadLag.get("coffee");
    b.depart();
    for (let i = 0; i < fps; i++) f.tick(1000 / fps);
    return {
      top: b.top,
      x: c.x,
      y: c.y,
      lagX: lag.x,
      lagY: lag.y,
      departures: f.departures(),
      phase: f.state.phase,
      now: f.state.now,
    };
  });
  for (const r of results) {
    assert.equal(r.departures, 1);
    assert.equal(r.phase, "running");
    assert.equal(r.now, 490);
    for (const key of ["top", "x", "y", "lagX", "lagY"])
      assert.ok(Math.abs(r[key] - results[0][key]) < 0.05, key);
  }
});
