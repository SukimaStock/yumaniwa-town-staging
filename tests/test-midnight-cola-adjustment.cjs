'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'works/midnight-cola/sketch.js'), 'utf8');

function adjustmentHarness() {
    const calls = [];
    const context = {
        BOARD_NODES: null,
        gameState: { phase: 'ADJUSTMENT_LOCKED' },
        startEventGate() {},
        touched() {},
        applyEventAnimation() {},
        finishEvent() {},
        drawCapPanel() { calls.push('base'); return 'base-result'; },
        updateColaRollLeverLock() { calls.push('update'); },
        drawColaRollLeverLockHardware() { calls.push('hardware'); }
    };
    vm.createContext(context);
    const installerStart = source.indexOf('var drawColaRollConsolidatedAdjustmentPanel =');
    const installerEnd = source.indexOf('\n/*\n * ------------------------------------------------------------\n * CAPACITY SPILL', installerStart);
    const wrapperStart = source.indexOf('const drawCapPanelBaseForLeverLock =');
    const wrapperEnd = source.indexOf('\nconst touchedBaseForLeverLock =', wrapperStart);
    assert.ok(installerStart >= 0 && installerEnd > installerStart);
    assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart);
    // Match real initialization order: wrappers are evaluated before setup installs the renderer.
    vm.runInContext(source.slice(installerStart, installerEnd), context);
    vm.runInContext(source.slice(wrapperStart, wrapperEnd), context);
    context.installColaRollConsolidatedAdjustmentSystem();
    return { context, calls };
}

test('locked lever wrapper captures the existing private adjustment renderer', () => {
    const { context, calls } = adjustmentHarness();
    const renderer = context.drawColaRollConsolidatedAdjustmentPanel;
    assert.equal(typeof renderer, 'function');
    assert.equal(renderer.name, 'drawAdjustmentPanel');
    assert.equal(context.drawAdjustmentPanel, undefined, 'private implementation stays private');
    // Spy on dispatch, without replacing any production export or executing canvas drawing.
    context.drawColaRollConsolidatedAdjustmentPanel = () => calls.push('adjustment');
    assert.doesNotThrow(() => context.drawCapPanel());
    assert.deepEqual(calls, ['update', 'adjustment', 'hardware']);
});

test('unlocked phases preserve the original cap renderer and lever hardware', () => {
    const { context, calls } = adjustmentHarness();
    context.gameState.phase = 'RUNNING';
    assert.equal(context.drawCapPanel(), 'base-result');
    assert.deepEqual(calls, ['update', 'base', 'hardware']);
});

test('repeated setup keeps the captured renderer and installed wrapper unchanged', () => {
    const { context } = adjustmentHarness();
    const renderer = context.drawColaRollConsolidatedAdjustmentPanel;
    const wrapper = context.drawCapPanel;
    context.installColaRollConsolidatedAdjustmentSystem();
    assert.equal(context.drawColaRollConsolidatedAdjustmentPanel, renderer);
    assert.equal(context.drawCapPanel, wrapper);
});


test('Cola entry cache key changes with the repaired sketch', () => {
    const entry = fs.readFileSync(path.join(__dirname, '..', 'works/midnight-cola/index.html'), 'utf8');
    assert.match(entry, /sketch\.js\?v=20261001-adjustment-renderer/);
});
