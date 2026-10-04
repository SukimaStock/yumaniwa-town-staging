// Real DOM playthrough; requires Playwright and an installed Chromium.
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
    const click = (action) => page.locator(`[data-action="${action}"]`).click();
    const add = async (id) => {
      await page.locator(`.place[data-id="${id}"]`).click();
      await page.locator(`dialog [data-action="add"]`).click();
    };
    const route = () =>
      page
        .locator(".route-card")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.id));
    const screenshot = async (name) => {
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(process.env.SCREENSHOT_DIR, name + ".png"),
          fullPage: true,
        });
      }
    };
    await page.goto(base);
    await page.locator("[data-action=begin]").waitFor();
    await screenshot("title");
    await click("begin");
    await add("laundry");
    await add("coffee");
    await page.locator("[data-action=up][data-id=coffee]").click();
    assert.deepEqual(await route(), ["coffee", "laundry"]);
    await add("door");
    await page.locator("[data-action=remove][data-id=door]").click();
    assert.deepEqual(await route(), ["coffee", "laundry"]);
    await add("door");
    // Duplicate cards cannot be added through the notebook.
    await page.locator(".place[data-id=coffee]").click();
    assert.ok(await page.locator("dialog [data-action=add]").isDisabled());
    await page.locator("#close-note").click();
    await screenshot("home-board");
    const dockBefore = await page.locator("#desk").boundingBox();
    await click("start");
    assert.match(
      await page.locator(".departure-mark").innerText(),
      /08:10.*START/,
    );
    await page.waitForTimeout(280);
    assert.ok((await page.locator("#desk").boundingBox()).y > dockBefore.y);
    assert.equal(await page.locator("#sound").innerText(), "音 OFF");
    await screenshot("departed");
    await page.locator("[data-action=mall]").waitFor({ timeout: 15000 });
    await click("mall");
    await add("bakery");
    await add("food");
    await add("lift");
    await add("roof");
    await screenshot("mall-board");
    await click("start");
    await page.locator(".notice h3").waitFor({ timeout: 15000 });
    assert.match(await page.locator(".notice").innerText(), /花屋/);
    const before = await page.locator(".clock").innerText();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator(".clock").innerText(), before);
    await screenshot("event");
    await click("clear");
    await add("food");
    await add("florist");
    await add("roof");
    await click("start");
    await page.locator("[data-action=mall-again]").waitFor({ timeout: 15000 });
    assert.match(await page.locator(".record").innerText(), /08:48/);
    assert.match(await page.locator(".record").innerText(), /小さな花/);
    await screenshot("flower-record");
    // A second route, then the cancelled lift, then recovery from that failure.
    await click("mall-again");
    await add("bakery");
    await add("central");
    await add("escalator");
    await add("roof");
    await click("start");
    await page.locator(".notice").waitFor({ timeout: 15000 });
    await click("start");
    await page.locator("[data-action=mall-again]").waitFor({ timeout: 15000 });
    assert.match(await page.locator(".record").innerText(), /08:47/);
    await click("mall-again");
    await add("bakery");
    await add("food");
    await add("lift");
    await add("roof");
    await click("start");
    await page.locator(".notice").waitFor({ timeout: 15000 });
    await click("start");
    await page
      .getByText("ここで、ひと休み。", { exact: true })
      .waitFor({ timeout: 15000 });
    assert.match(await page.locator(".notice").innerText(), /8:52/);
    await click("clear");
    await add("food");
    await add("florist");
    await add("roof");
    await click("start");
    await page.locator("[data-action=mall-again]").waitFor({ timeout: 15000 });
    // Fresh navigation/reload and native scrolling at narrow widths; no horizontal overflow.
    await page.reload();
    await page.locator("[data-action=begin]").waitFor();
    await click("begin");
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.waitForTimeout(260);
      const layout = await page.evaluate(() => {
        const canvas = document.querySelector("canvas"),
          ctx = canvas.getContext("2d");
        const pixels = [0, canvas.width - 1].map((x) => [
          ...ctx.getImageData(x, Math.floor(canvas.height * 0.25), 1, 1).data,
        ]);
        const places = [...document.querySelectorAll(".place")].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          };
        });
        const dock = document
          .querySelector("#controls")
          .getBoundingClientRect();
        return {
          height: document.documentElement.scrollHeight,
          pixels,
          places,
          dockBottom: dock.bottom,
          offsets: [SSE.viewport.offsetX, SSE.viewport.offsetY],
        };
      });
      assert.ok(layout.height <= viewport.height, JSON.stringify(layout));
      assert.deepEqual(layout.offsets, [0, 0]);
      assert.ok(
        layout.pixels.every(
          (rgb) =>
            rgb[0] > 150 && rgb[1] > 150 && rgb[2] > 150 && rgb[3] === 255,
        ),
        "canvas edges must be morning colours",
      );
      assert.ok(
        layout.places.every(
          (r) =>
            r.width >= 44 &&
            r.height >= 44 &&
            r.left >= 0 &&
            r.right <= viewport.width,
        ),
        JSON.stringify(layout.places),
      );
      assert.ok(layout.dockBottom <= viewport.height);
      await add("coffee");
      assert.equal(await page.locator(".thread path").count(), 1);
      await screenshot(`viewport-${viewport.width}`);
      await page.locator("[data-action=remove][data-id=coffee]").click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await add("laundry");
    await add("coffee");
    await add("door");
    // Actual pointer drag of the handle, followed by an ordinary tap inspection.
    await page.locator("[data-id=coffee].route-card").scrollIntoViewIfNeeded();
    let handle = await page
        .locator(".route-card[data-id=coffee] .drag-handle")
        .boundingBox(),
      target = await page.locator(".route-card[data-id=laundry]").boundingBox();
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2,
    );
    await page.mouse.down();
    const threadBefore = await page
      .locator(".thread path")
      .evaluateAll((nodes) =>
        nodes.map((el) => el.getAttribute("d")).join("|"),
      );
    await page.mouse.move(
      handle.x + handle.width / 2 + 8,
      target.y + target.height / 2 + 7,
      { steps: 6 },
    );
    assert.ok(await page.locator(".drag-ghost.snapped").isVisible());
    await page.waitForTimeout(160);
    assert.notEqual(
      await page
        .locator(".thread path")
        .evaluateAll((nodes) =>
          nodes.map((el) => el.getAttribute("d")).join("|"),
        ),
      threadBefore,
    );
    const ghost = await page.locator(".drag-ghost").boundingBox();
    assert.ok(Math.abs(ghost.y - target.y) < 3);
    assert.ok((await page.locator(".yielding").count()) >= 2);
    await screenshot("magnet-held");
    await page.mouse.up();
    await page.waitForTimeout(250);
    assert.deepEqual(await route(), ["coffee", "laundry", "door"]);
    assert.equal(await page.locator("dialog").isVisible(), false);
    await page.locator(".drag-handle[data-id=coffee]").click();
    assert.ok(await page.locator("dialog").isVisible());
    await page.locator("#close-note").click();
    // A real touchscreen stream, including cancellation, complements mouse drag.
    const cdp = await page.context().newCDPSession(page);
    const touchDrag = async (cancel = false) => {
      const handle = await page
        .locator(".route-card[data-id=coffee] .drag-handle")
        .boundingBox();
      const dest = await page
        .locator(".route-card[data-id=laundry]")
        .boundingBox();
      const x = handle.x + handle.width / 2,
        y = handle.y + handle.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: dest.y + dest.height / 2 }],
      });
      await page.waitForTimeout(160);
      assert.ok(await page.locator(".drag-ghost.snapped").isVisible());
      await cdp.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(250);
      assert.equal(await page.locator(".drag-ghost").count(), 0);
      assert.equal(await page.locator("dialog").isVisible(), false);
    };
    await touchDrag();
    assert.deepEqual(await route(), ["laundry", "coffee", "door"]);
    await touchDrag(true);
    assert.deepEqual(await route(), ["laundry", "coffee", "door"]);
    await cdp.detach();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await click("reset");
    await add("laundry");
    await add("coffee");
    await page.locator("[data-action=up][data-id=coffee]").click();
    assert.deepEqual(await route(), ["coffee", "laundry"]);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    assert.equal(await page.locator(".thread path").count(), 2);
    await screenshot("reduced-motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await click("reset");
    assert.equal(await page.locator("#sound").innerText(), "音 OFF");
    await page.locator("#sound").click();
    const report = await page.evaluate(() => SSE.dev.report());
    assert.equal(report.observation.runtime.engineBootState, "running");
    assert.equal(report.observation.audio.enabled, true);
    assert.equal(report.observation.audio.contextState, "running");
    assert.equal(report.diagnostics.summary.error, 0);
    assert.ok(!report.health.some((x) => x.level === "error"));
    await page.locator("#sound").click();
    await click("reset");
    assert.equal(await page.locator("#sound").innerText(), "音 OFF");
    assert.equal(
      await page.evaluate(() => SSE.dev.report().observation.audio.enabled),
      false,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      JSON.stringify(
        {
          result: "PASS",
          viewports: [320, 390, 844, 1280],
          home: true,
          flower: "08:48",
          escalator: "08:47",
          failureRecovery: true,
          drag: true,
          magneticSnap: true,
          touchscreenDrag: true,
          touchCancel: true,
          threadFollows: true,
          reducedMotion: true,
          canvasEdges: "ivory",
          departureStamp: true,
          errors,
          external,
          report,
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
