"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("./model.js");
function plan(s, ids) {
  for (const id of ids) {
    M.discover(s, id);
    assert.ok(M.add(s, id));
  }
  assert.ok(M.start(s));
}
function run(s, fps = 60) {
  let frames = 0;
  while (s.phase === "running" && frames++ < fps * 60) M.update(s, 1 / fps);
  assert.ok(frames < fps * 60);
  return s;
}
function bread(fps = 60) {
  const s = M.create("mall");
  plan(s, ["bakery", "food", "lift", "roof"]);
  run(s, fps);
  assert.equal(s.phase, "event");
  return s;
}
function resume(s, ids, fps = 60) {
  [...s.route].forEach((id) => M.remove(s, id));
  plan(s, ids);
  return run(s, fps);
}
test("home: wait for laundry and leave at 08:16", () => {
  const s = M.create();
  plan(s, ["coffee", "laundry", "door"]);
  run(s);
  assert.equal(s.phase, "success");
  assert.equal(M.time(s.now), "08:16");
  assert.deepEqual(
    s.record.map((x) => x.at),
    [490, 491, 494, 496, 496],
  );
});
test("investigation, duplicate, current node, unknown and reorder boundaries", () => {
  const s = M.create();
  assert.equal(M.add(s, "coffee"), false);
  M.discover(s, "coffee");
  assert.ok(M.add(s, "coffee"));
  assert.equal(M.add(s, "coffee"), false);
  assert.equal(M.add(s, "table"), false);
  assert.equal(M.discover(s, "bogus"), false);
  M.discover(s, "laundry");
  M.add(s, "laundry");
  assert.ok(M.move(s, "laundry", -1));
  assert.deepEqual(s.route, ["laundry", "coffee"]);
  assert.equal(M.move(s, "laundry", -1), false);
  assert.ok(M.remove(s, "coffee"));
  assert.equal(M.remove(s, "coffee"), false);
});
test("START does not evaluate the whole plan; bakery waiting is 6 minutes", () => {
  const s = M.create("mall");
  plan(s, ["bakery", "lift", "roof"]);
  assert.equal(s.phase, "running");
  run(s);
  assert.equal(s.phase, "event");
  assert.equal(s.now, 521);
  assert.equal(s.at, "bakery");
  assert.equal(s.record[1].at, 514);
  assert.ok(s.done.includes("bakery"));
});
test("event freezes time and reveals pleasant new link", () => {
  const s = bread();
  const before = JSON.stringify(s);
  M.update(s, 500);
  assert.equal(JSON.stringify(s), before);
  assert.equal(M.edge(s, "florist", "roof"), 2);
  assert.ok(s.discovered.includes("florist"));
});
test("stable escalator route succeeds at 08:47", () => {
  const s = resume(bread(), ["central", "escalator", "roof"]);
  assert.equal(s.phase, "success");
  assert.equal(s.now, 527);
});
test("flower detour succeeds at 08:48 with a flower in the record", () => {
  const s = resume(bread(), ["food", "florist", "roof"]);
  assert.equal(s.phase, "success");
  assert.equal(s.now, 528);
  assert.ok(s.record.some((r) => r.text === "小さな花を添えた"));
});
test("cancelled lift fails at 08:44 and returns directly to replanning", () => {
  const s = bread();
  assert.ok(M.start(s));
  run(s);
  assert.equal(s.phase, "failed");
  assert.equal(s.now, 524);
  assert.match(s.message, /8:52/);
  assert.ok(M.remove(s, "roof"));
});
test("invalid link fails only when traversed, can be replaced immediately", () => {
  const s = bread();
  resume(s, ["roof"]);
  assert.equal(s.phase, "failed");
  assert.match(s.message, /直接/);
  resume(s, ["central", "escalator", "roof"]);
  assert.equal(s.phase, "success");
});
test("exact deadline accepted; a minute late rejected", () => {
  const exact = bread();
  exact.now = 524;
  resume(exact, ["central", "escalator", "roof"]);
  assert.equal(exact.now, 530);
  assert.equal(exact.phase, "success");
  const late = bread();
  late.now = 525;
  resume(late, ["central", "escalator", "roof"]);
  assert.equal(late.phase, "failed");
  assert.equal(late.now, 531);
});
test("roof before opening waits until 08:46", () => {
  const s = M.create("mall");
  s.at = "escalator";
  s.now = 522;
  s.done = ["bakery"];
  s.event = true;
  plan(s, ["roof"]);
  run(s);
  assert.equal(s.now, 526);
  assert.equal(s.phase, "success");
});
test("scheduled lift waits for departure and accepts arrival exactly at departure", () => {
  for (const start of [522, 524]) {
    const s = M.create("mall");
    s.at = "lift";
    s.now = start;
    s.done = ["bakery"];
    plan(s, ["roof"]);
    run(s);
    assert.equal(s.now, 526);
    assert.equal(s.phase, "success");
  }
});
test("missed 08:44 departure selects next and exposes the missed connection", () => {
  const s = M.create("mall");
  s.at = "lift";
  s.now = 525;
  s.done = ["bakery"];
  plan(s, ["roof"]);
  assert.equal(s.phase, "failed");
  assert.match(s.message, /8:52/);
});
test("unfinished route can be extended; home missing task can be recovered", () => {
  const s = M.create();
  plan(s, ["coffee"]);
  run(s);
  assert.equal(s.phase, "plan");
  plan(s, ["door"]);
  run(s);
  assert.equal(s.phase, "failed");
  plan(s, ["laundry", "door"]);
  run(s);
  assert.equal(s.phase, "success");
});
test("30/60/120fps produce identical times, phases and journey records", () => {
  const results = [30, 60, 120].map((fps) => {
    const s = bread(fps);
    return resume(s, ["food", "florist", "roof"], fps);
  });
  for (const s of results.slice(1)) {
    assert.equal(s.now, results[0].now);
    assert.deepEqual(s.record, results[0].record);
    assert.equal(s.phase, "success");
  }
});
test("paused clock ignores invalid deltas; running edits cannot corrupt route", () => {
  const s = M.create();
  M.update(s, NaN);
  M.update(s, -1);
  assert.equal(s.now, 490);
  plan(s, ["coffee"]);
  assert.equal(M.remove(s, "coffee"), false);
  assert.equal(M.move(s, "coffee", 1), false);
  assert.equal(M.add(s, "door"), false);
});
