// Real pointer/canvas and accessible DOM playthrough; requires Playwright and Chromium.
"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
(async () => {
  const root = path.resolve(__dirname, "../.."),
    server = http.createServer((req, res) => {
      let file = path.resolve(
        root,
        "." + new URL(req.url, "http://local").pathname,
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory())
        file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[
          path.extname(file)
        ] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      fs.createReadStream(file).pipe(res);
    });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      }),
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).hostname !== "127.0.0.1") external.push(r.url());
    });
    const base = `http://127.0.0.1:${server.address().port}/works/morning-thread/`;
    const wait = () => page.waitForTimeout(340);
    const box = (key) => page.locator(`[data-object="${key}"]`).boundingBox();
    const centre = async (key) => {
      const b = await box(key);
      assert.ok(b, key + " exists");
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const tap = async (p) => {
      await page.mouse.click(p.x, p.y);
      await wait();
    };
    const route = async () => {
      const v = await page.locator("#board").getAttribute("data-connections");
      return v ? v.split(",") : [];
    };
    const notebook = () => page.locator("#board").getAttribute("data-notebook");
    const paper = () => centre("paper");
    const ensure = async (mode) => {
      for (let i = 0; i < 5 && (await notebook()) !== mode; i++)
        await tap(await paper());
      assert.equal(await notebook(), mode);
    };
    const drag = async (a, b, hold = 0) => {
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 12 });
      if (hold) await page.waitForTimeout(hold);
      await page.mouse.up();
      await wait();
    };
    const inspect = async (id) => {
      await ensure("CLOSED");
      const b = await page.locator(`.place[data-id="${id}"]`).boundingBox();
      await tap({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
      assert.ok(await page.locator("[data-object=slip]").count());
    };
    const pick = async (id, after = null) => {
      await inspect(id);
      const a = await centre("slip"),
        p = await paper();
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(a.x, p.y - 15, { steps: 10 });
      await wait();
      assert.equal(await notebook(), "OPEN");
      const to = await centre(after ? "card-" + after : "origin");
      await page.mouse.move(to.x, to.y + 66, { steps: 12 });
      await page.waitForTimeout(120);
      assert.equal(
        await page.locator("#board").getAttribute("data-preview"),
        after || (id === "coffee" ? "table" : "entry"),
      );
      await page.mouse.up();
      await wait();
      assert.ok((await route()).includes(id));
    };
    const screenshot = async (name) => {
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: path.join(process.env.SCREENSHOT_DIR, name + ".png"),
        });
      }
    };
    const click = (action) =>
      page.locator(`#controls [data-action="${action}"]`).click();
    const start = async () => {
      const p = await centre("start");
      await drag(p, { x: p.x + 55, y: p.y }, 100);
    };
    const phase = async (expected) => {
      await page.waitForFunction(
        (v) => document.getElementById("app").dataset.phase === v,
        expected,
      );
    };
    const fallbackOpen = async () => {
      if (await page.locator("#fallback").isHidden())
        await page.locator("#access").click();
    };
    const reset = async () => {
      await fallbackOpen();
      await page.locator("#fallback [data-action=reset]").click();
      await page.locator("#fallback [data-action=access-close]").click();
      await wait();
    };
    await page.goto(base);
    await page.locator("[data-action=begin]").waitFor();
    await screenshot("title");
    await click("begin");
    await wait();
    // Paper edge taps walk the whole three-state sequence, with no panel button.
    assert.equal(await notebook(), "PEEK");
    for (const target of ["OPEN", "PEEK", "CLOSED", "PEEK"]) {
      await tap(await paper());
      assert.equal(await notebook(), target);
    }
    // Slow partial drag snaps to the closest resting height.
    let p = await paper();
    await drag(p, { x: p.x, y: 760 }, 180);
    assert.equal(await notebook(), "CLOSED");
    // Up/down flicks use the release velocity; intermediate drags use distance.
    p = await paper();
    await drag(p, { x: p.x, y: p.y - 110 });
    assert.equal(await notebook(), "PEEK");
    p = await paper();
    await drag(p, { x: p.x, y: 270 });
    assert.equal(await notebook(), "OPEN");
    p = await paper();
    await drag(p, { x: p.x, y: p.y + 120 });
    assert.equal(await notebook(), "PEEK");
    await pick("coffee");
    await pick("laundry", "coffee");
    await pick("door", "laundry");
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    await screenshot("home-thread");
    // Sample the real rendered drag, while all geometry remains view-only.
    const frameSample = page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [];
          let prior = null;
          const started = performance.now();
          function step(t) {
            if (prior !== null) frames.push(t - prior);
            prior = t;
            if (t - started < 2200) requestAnimationFrame(step);
            else {
              frames.sort((a, b) => a - b);
              resolve({
                samples: frames.length,
                averageMs: frames.reduce((a, b) => a + b, 0) / frames.length,
                p95Ms: frames[Math.floor(frames.length * 0.95)],
                maxMs: frames.at(-1),
                engine: SSE.dev.report().performance,
              });
            }
          }
          requestAnimationFrame(step);
        }),
    );
    const held = await centre("card-coffee");
    await page.mouse.move(held.x, held.y);
    await page.mouse.down();
    for (let i = 0; i < 70; i++) {
      await page.mouse.move(
        held.x + Math.sin(i * 0.13) * 15,
        held.y + Math.cos(i * 0.13) * 15,
      );
      await page.waitForTimeout(16);
    }
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await wait();
    const performanceSample = await frameSample;
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    // A held card follows the pointer; the itinerary stays unchanged until release.
    let a = await centre("card-door"),
      o = await centre("origin");
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(o.x, o.y + 66, { steps: 12 });
    await page.waitForTimeout(100);
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    assert.equal(
      await page.locator("#board").getAttribute("data-preview"),
      "table",
    );
    await screenshot("snap-preview");
    await page.mouse.up();
    await wait();
    assert.deepEqual(await route(), ["door", "coffee", "laundry"]);
    a = await centre("card-door");
    let to = await centre("card-laundry");
    await drag(a, { x: to.x, y: to.y + 66 });
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    // Pull beyond the paper edge, hold tension, release; the loose paper stays.
    a = await centre("card-door");
    p = await paper();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x, p.y + 7, { steps: 12 });
    await page.waitForTimeout(180);
    assert.equal(
      await page.locator("#board").getAttribute("data-tension"),
      "ready",
    );
    await screenshot("thread-tension");
    await page.mouse.up();
    await wait();
    assert.deepEqual(await route(), ["coffee", "laundry"]);
    a = await centre("card-door");
    to = await centre("card-laundry");
    await drag(a, { x: to.x, y: to.y + 66 });
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    // A connected paper can stay where it is placed, without changing order.
    a = await centre("card-coffee");
    await drag(a, { x: 190, y: 640 }, 120);
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    const free = await centre("card-coffee");
    assert.ok(Math.abs(free.x - 190) < 2 && Math.abs(free.y - 637) < 2);
    to = await centre("origin");
    await drag(free, { x: to.x, y: to.y + 66 });
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    // Real CDP touch drag and cancellation. No game-state injection.
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type, points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p) => ({
          x: p.x,
          y: p.y,
          radiusX: 4,
          radiusY: 4,
          id: p.id || 1,
          force: 1,
        })),
      });
    a = await centre("card-laundry");
    to = await centre("origin");
    await touch("touchStart", [a]);
    await touch("touchMove", [{ x: to.x, y: to.y + 66 }]);
    await page.waitForTimeout(120);
    await touch("touchEnd", []);
    await wait();
    assert.deepEqual(await route(), ["laundry", "coffee", "door"]);
    a = await centre("card-laundry");
    to = await centre("card-coffee");
    await drag(a, { x: to.x, y: to.y + 66 });
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    a = await centre("card-coffee");
    await touch("touchStart", [a]);
    await touch("touchMove", [{ x: a.x + 50, y: a.y + 75 }]);
    await touch("touchCancel", []);
    await wait();
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    assert.equal(await page.locator("#board").getAttribute("data-drag"), "");
    // Multi-touch retains the first pointer; cancellation cannot commit.
    await touch("touchStart", [a]);
    await touch("touchStart", [a, { x: a.x + 70, y: a.y + 30, id: 2 }]);
    await touch("touchMove", [
      { x: a.x + 40, y: a.y + 80 },
      { x: a.x + 75, y: a.y + 40, id: 2 },
    ]);
    await touch("touchCancel", []);
    await wait();
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    await start();
    await phase("success");
    assert.ok((await page.locator("#page").innerText()).includes("08:16"));
    await click("mall");
    await wait();
    await pick("bakery");
    await pick("central", "bakery");
    await pick("escalator", "central");
    await pick("roof", "escalator");
    await screenshot("mall-thread");
    await start();
    await phase("event");
    assert.equal(await notebook(), "OPEN");
    assert.equal(
      await page
        .locator(".clock")
        .innerText()
        .then((s) => s.slice(0, 5)),
      "08:41",
    );
    await page.waitForTimeout(1200);
    assert.equal(
      (await page.locator(".clock").innerText()).slice(0, 5),
      "08:41",
    );
    await screenshot("event-replan");
    // Current-place slips cannot partially add a loose target (model boundary).
    await inspect("food");
    await tap(await centre("slip"));
    await inspect("bakery");
    await tap(await centre("slip"));
    await tap(await centre("card-food"));
    assert.deepEqual(await route(), ["central", "escalator", "roof"]);
    await fallbackOpen();
    assert.ok(
      await page
        .locator("#fallback [data-action=add][data-id=bakery]")
        .isDisabled(),
    );
    await page.locator("#fallback [data-action=access-close]").click();
    await start();
    await phase("ending");
    assert.ok((await page.locator("#page").innerText()).includes("08:47"));
    await screenshot("ending");
    // Keyboard/tap fallback can complete both recovery and a second route.
    await click("mall-again");
    await wait();
    const fallbackAdd = async (id) => {
      await fallbackOpen();
      await page
        .locator(`#fallback [data-action=inspect][data-id="${id}"]`)
        .click();
      await page
        .locator(`#fallback [data-action=add][data-id="${id}"]`)
        .click();
    };
    const fallbackStart = async () => {
      await fallbackOpen();
      await page.locator("#fallback [data-action=start]").click();
      await page.locator("#fallback [data-action=access-close]").click();
    };
    for (const id of ["bakery", "food", "lift", "roof"]) await fallbackAdd(id);
    assert.deepEqual(await route(), ["bakery", "food", "lift", "roof"]);
    assert.ok(
      await page
        .locator("#fallback [data-action=add][data-id=bakery]")
        .isDisabled(),
    );
    await fallbackStart();
    await phase("event");
    await fallbackStart();
    await phase("failed");
    assert.equal(
      (await page.locator(".clock").innerText()).slice(0, 5),
      "08:44",
    );
    await fallbackOpen();
    for (const id of ["roof"])
      await page
        .locator(`#fallback [data-action=remove][data-id="${id}"]`)
        .click();
    for (const id of ["food", "florist", "roof"]) await fallbackAdd(id);
    await fallbackStart();
    await phase("ending");
    assert.ok((await page.locator("#page").innerText()).includes("08:50"));
    await click("mall-again");
    for (const id of ["bakery", "food", "florist", "roof"])
      await fallbackAdd(id);
    await fallbackStart();
    await phase("event");
    await fallbackStart();
    await phase("ending");
    assert.ok((await page.locator("#page").innerText()).includes("08:48"));
    await click("mall-again");
    await reset();
    assert.deepEqual(await route(), []);
    assert.equal(await page.locator('[data-object^="card-"]').count(), 0);
    assert.equal(await page.locator("[data-object=start]").count(), 0);
    // Tap-only direct surface route: slip tap -> current place/card tap -> tail tap.
    await inspect("bakery");
    await tap(await centre("slip"));
    await tap(await centre("origin"));
    assert.deepEqual(await route(), ["bakery"]);
    await inspect("central");
    await tap(await centre("slip"));
    await tap(await centre("card-bakery"));
    assert.deepEqual(await route(), ["bakery", "central"]);
    // Accessible physical-paper projection works with Enter, without a drag.
    await page.locator("[data-object=card-central]").focus();
    await page.keyboard.press("Enter");
    await wait();
    await tap(await centre("knot"));
    assert.deepEqual(await route(), ["bakery"]);
    await tap(await centre("card-central"));
    await tap(await centre("card-central"));
    await tap(await centre("card-bakery"));
    assert.deepEqual(await route(), ["bakery", "central"]);
    await fallbackOpen();
    await page.locator("#fallback [data-action=up][data-id=central]").click();
    assert.deepEqual(await route(), ["central", "bakery"]);
    await page.locator("#fallback [data-action=down][data-id=central]").click();
    assert.deepEqual(await route(), ["bakery", "central"]);
    await page.locator("#fallback [data-action=access-close]").click();
    await reset();
    const layouts = [];
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [844, 390],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await wait();
      await ensure("OPEN");
      const layout = await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        edges: [
          ...["left", "right"].map((side) => {
            const c = document.getElementById("gameCanvas"),
              ctx = c.getContext("2d");
            return [
              ...ctx.getImageData(side === "left" ? 0 : c.width - 1, 1, 1, 1)
                .data,
            ];
          }),
        ],
        safe: getComputedStyle(document.getElementById("safe-probe")).height,
      }));
      assert.equal(layout.scrollWidth, width);
      assert.equal(layout.scrollHeight, height);
      assert.ok(
        layout.edges.every((p) => p[0] > 200 && p[1] > 200 && p[2] > 180),
      );
      layouts.push(layout);
      await screenshot("viewport-" + width);
      const pb = await box("paper");
      assert.ok(pb.x >= 0 && pb.x + pb.width <= width);
      assert.ok(pb.height >= 44);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await reset();
    for (const id of [
      "bakery",
      "central",
      "food",
      "lift",
      "florist",
      "escalator",
      "roof",
    ])
      await fallbackAdd(id);
    await page.locator("#fallback [data-action=access-close]").click();
    await ensure("OPEN");
    await wait();
    assert.equal(await page.locator('[data-object^="card-"]').count(), 7);
    await screenshot("all-cards-320");
    await reset();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ensure("OPEN");
    await fallbackAdd("bakery");
    await fallbackAdd("central");
    await page.locator("#fallback [data-action=up][data-id=central]").click();
    assert.deepEqual(await route(), ["central", "bakery"]);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.locator("#fallback [data-action=access-close]").click();
    await screenshot("reduced-motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await reset();
    assert.equal(await page.locator("#sound").innerText(), "音 OFF");
    await page.locator("#sound").click();
    await page.waitForTimeout(100);
    let report = await page.evaluate(() => SSE.dev.report());
    assert.equal(report.observation.audio.enabled, true);
    assert.equal(report.observation.audio.contextState, "running");
    await page.locator("#sound").click();
    await reset();
    assert.equal(await page.locator("#sound").innerText(), "音 OFF");
    await page.reload();
    await page.locator("[data-action=begin]").waitFor();
    report = await page.evaluate(() => SSE.dev.report());
    assert.equal(report.diagnostics.summary.error, 0);
    assert.ok(!report.health.some((x) => x.level === "error"));
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      JSON.stringify(
        {
          result: "PASS",
          home: "08:16",
          escalator: "08:47",
          flower: "08:48",
          failureRecovery: "08:50",
          notebookTapDragFlick: true,
          slipCarry: true,
          cardReorder: true,
          snapPreview: true,
          tensionDisconnect: true,
          reconnect: true,
          touch: true,
          touchCancel: true,
          multitouch: true,
          tapAndKeyboard: true,
          allSevenCardsAt320: true,
          reducedMotion: true,
          resetAndReload: true,
          layouts,
          performanceSample,
          report,
          errors,
          external,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
