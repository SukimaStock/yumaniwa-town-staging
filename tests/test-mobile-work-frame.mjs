// Serve the repository locally, then run: node tests/test-mobile-work-frame.mjs http://127.0.0.1:8000/
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = new URL(process.argv[2]);
const sizes = [[375, 667], [320, 568], [390, 844], [430, 932], [844, 390]];
const frameSelector = '#work-player-frame';
const tabSelector = '#work-player-peek-tab';
const collapsedSelector = '#work-player.visible.phone-controls-hidden';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openWork(page, work) {
    const url = new URL(base);
    url.searchParams.set('work', work.id);
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    await page.locator('#work-player.visible').waitFor();
    await page.waitForFunction(id => window.currentWorkId === id &&
        !document.getElementById('work-player-loading').classList.contains('visible'), work.id);
}

async function readBox(locator) {
    const box = await locator.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0);
    return box;
}

function checkSeparate(frame, tab, label) {
    assert.ok(frame.x + frame.width <= tab.x || tab.x + tab.width <= frame.x ||
        frame.y + frame.height <= tab.y || tab.y + tab.height <= frame.y,
        label + ' overlaps: ' + JSON.stringify({ frame, tab }));
}

async function inspectCollapsed(page, work, width, height) {
    const tab = page.locator(tabSelector);
    const frame = page.locator(frameSelector);
    const label = work.id + ' at ' + width + 'x' + height;
    await page.locator(collapsedSelector).waitFor();
    // The control bar animates for 260ms and the iframe follows its content observer.
    await page.waitForTimeout(350);
    const before = await readBox(frame);
    assert.ok(before.x >= 0 && before.y >= 0 &&
        before.x + before.width <= width + 1 && before.y + before.height <= height + 1, label);
    if (work.playerLayout === 'phone') {
        assert.ok(Math.abs(before.width - before.height * work.playerWidth / work.playerHeight) <= 1,
            label + ' did not preserve the registered aspect ratio');
    }
    if (work.mobileFrame === 'immersive') {
        await tab.waitFor({ state: 'hidden' });
        await page.touchscreen.tap(before.x + before.width / 2, before.y + before.height / 2);
        await tab.waitFor({ state: 'visible', timeout: 1500 });
        assert.deepEqual(await readBox(frame), before, label + ' moved when revealing the tab');
    }
    checkSeparate(before, await readBox(tab), label);
    if (work.id === 'oden' && width === 390) {
        assert.ok(Math.abs(before.y - 60.5) <= 1 && before.width === 382 && before.height === 724,
            label + ' changed the original centered fit despite sufficient space');
    }
    if (work.id === 'oden') {
        const board = await readBox(page.frameLocator(frameSelector).locator('#board'));
        assert.ok(Math.abs(board.width - board.height * 4 / 7) < 1, label + ' stretched the board');
    }
    if (work.mobileFrame === 'immersive' && width === 375) {
        await page.waitForTimeout(1500);
        assert.ok(await tab.isVisible(), label + ' hid before it could be used');
        await tab.waitFor({ state: 'hidden', timeout: 2000 });
        assert.deepEqual(await readBox(frame), before, label + ' moved when hiding the tab');
    }
}

async function checkWork(work) {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    try {
        await openWork(page, work);
        for (const [width, height] of sizes) {
            await page.setViewportSize({ width, height });
            await inspectCollapsed(page, work, width, height);
            // Finish each immersive sample in its idle state before the next resize.
            if (work.mobileFrame === 'immersive' && width !== 844) {
                await page.locator(tabSelector).waitFor({ state: 'hidden', timeout: 3500 });
            }
        }
        await page.locator(tabSelector).tap();
        await page.locator(collapsedSelector).waitFor({ state: 'hidden' });
        if (work.id === 'oden') {
            await page.locator(collapsedSelector).waitFor({ timeout: 6500 });
            await page.locator(tabSelector).tap();
        }
        await page.locator('#btn-close-work').tap();
        await page.locator('#work-player.visible').waitFor({ state: 'hidden' });
        console.log('PASS', work.id, 'five viewports and return');
    } finally {
        await page.close();
    }
}

async function checkCollapseTransition(id, width, height, insets) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    try {
        const session = await page.context().newCDPSession(page);
        await session.send('Emulation.setSafeAreaInsetsOverride', { insets });
        await page.addInitScript(() => {
            if (window !== window.top) return;
            window.peekOverlaps = [];
            function sample() {
                const peek = document.getElementById('work-player-peek-tab');
                if (peek && !peek.hidden && getComputedStyle(peek).visibility === 'visible') {
                    const tab = peek.getBoundingClientRect();
                    const frame = document.getElementById('work-player-frame').getBoundingClientRect();
                    if (tab.width && tab.right > frame.left && tab.left < frame.right &&
                        tab.bottom > frame.top && tab.top < frame.bottom) {
                        window.peekOverlaps.push({ tabBottom: tab.bottom, frameTop: frame.top });
                    }
                }
                requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
        });
        await openWork(page, { id });
        await page.locator(collapsedSelector).waitFor();
        await page.locator(tabSelector).waitFor({ state: 'visible' });
        await page.waitForTimeout(350);
        const tab = await readBox(page.locator(tabSelector));
        assert.ok(tab.x >= (insets.left || 0) && tab.y >= (insets.top || 0));
        assert.deepEqual(await page.evaluate(() => window.peekOverlaps), [],
            id + ' overlapped during collapse');
        console.log('PASS safe-area and collapse transition', id);
    } finally {
        await page.close();
    }
}

async function checkReaderAndTablet() {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    try {
        await openWork(page, { id: 'oden' });
        await page.locator(collapsedSelector).waitFor();
        await page.setViewportSize({ width: 820, height: 1180 });
        await page.locator(collapsedSelector).waitFor({ state: 'hidden' });
        await page.locator('#btn-close-work').tap();
        await page.setViewportSize({ width: 375, height: 667 });
        await page.evaluate(() => window.openNoteReader({
            title: 'Reader fixture', embedUrl: 'about:blank'
        }));
        await page.locator('#work-player.visible[data-frame-mode="reader"]').waitFor();
        await page.waitForTimeout(3300);
        assert.equal(await page.locator(collapsedSelector).count(), 0);
        await page.locator('#btn-close-work').tap();
        await page.locator('#work-player.visible').waitFor({ state: 'hidden' });
        console.log('PASS tablet resize and reader controls');
    } finally {
        await page.close();
    }
}

try {
    const catalog = await browser.newPage();
    await catalog.goto(base.href, { waitUntil: 'domcontentloaded' });
    const works = await catalog.evaluate(() => WORKS.filter(work =>
        work.status === 'open' && ['embedded', 'itch_embed'].includes(work.launch)));
    await catalog.close();
    assert.ok(works.length);
    for (const id of ['dotweather', 'steamclock']) {
        assert.equal(works.find(work => work.id === id)?.mobileFrame, 'immersive', id);
    }
    for (let i = 0; i < works.length; i += 3) {
        await Promise.all(works.slice(i, i + 3).map(checkWork));
    }
    await checkReaderAndTablet();
    await checkCollapseTransition('oden', 375, 667, { top: 47, bottom: 34 });
    await checkCollapseTransition('orbit', 844, 390, { left: 53, right: 53, bottom: 21 });
    console.log('PASS', works.length, 'works');
} finally {
    await browser.close();
}
