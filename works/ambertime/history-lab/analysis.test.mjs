import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {analyzeHistory} from './analysis.mjs';
import {simulateScenario} from './scenarios.mjs';
import {newMarketRulesDistillery,restoreDistillery,serializeDistillery} from '../partner-orders.mjs';

test('new career has no invented milestones or trade', () => {
  const result = analyzeHistory(newMarketRulesDistillery(42));
  assert.deepEqual(result.timeline,[]);
  assert.deepEqual(result.shops,[]);
  assert.deepEqual(result.regions,[]);
  assert.equal(result.totals.sold,0);
});

test('analysis agrees with formal replay and is deterministic and read-only', () => {
  const {game} = simulateScenario('local',36);
  const original = serializeDistillery(game);
  const analysis = analyzeHistory(game);
  assert.deepEqual(analyzeHistory(restoreDistillery(original)),analysis);
  assert.equal(serializeDistillery(game),original);
  assert.equal(analysis.totals.sold,game.core.totals.bottlesSold);
  assert.equal(analysis.monthlySales.reduce((n,row)=>n+row.sold,0),analysis.totals.sold);
  for (const row of analysis.monthlySales) assert.equal(Object.values(row.channels).reduce((a,b)=>a+b),row.sold);
  for (const shop of analysis.shops) {
    assert.equal(shop.bottles,game.shop.deliveries.filter(row=>row.shopId===shop.id).reduce((n,row)=>n+row.count,0));
  }
  for (const event of analysis.timeline) assert.ok(game.operations[event.operationIndex]);
});

test('30-year histories preserve differences in supply, reach and relationship duration', () => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));
  const {local,wide,mixed} = Object.fromEntries(rows.map(row=>[row.id,row.analysis]));
  for (const analysis of [local,wide,mixed]) {
    assert.equal(analysis.elapsedMonths,360);
    assert.ok(analysis.timeline.length>=5 && analysis.timeline.length<=8);
    assert.equal(new Set(analysis.timeline.map(event=>event.id)).size,analysis.timeline.length);
    assert.deepEqual(analysis.timeline.map(event=>event.month),analysis.timeline.map(event=>event.month).sort((a,b)=>a-b));
    assert.ok(analysis.timeline.some(event=>event.kind==='handover'));
    assert.ok(analysis.timeline.some(event=>event.interpretation?.kind==='delivery-span'));
    assert.equal(analysis.firstOverseasInquiry.kind,'inquiry');
    for (const event of analysis.timeline.filter(event=>event.kind==='rumor')) assert.notEqual(event.evidence.channel,'direct');
  }
  assert.equal(local.shops.length,1);
  assert.ok(wide.shops.length>local.shops.length && mixed.shops.length>local.shops.length);
  assert.ok(local.aging.matureBottles>wide.aging.matureBottles);
  assert.ok(mixed.aging.matureBottles>wide.aging.matureBottles);
  assert.ok(local.firstOverseasInquiry.month<wide.firstOverseasInquiry.month);
});

test('legacy dated facts keep limited coverage and an unknown generation', () => {
  const original = readFileSync(new URL('../tests/fixtures/v08-legal-funds.json',import.meta.url),'utf8');
  const result = analyzeHistory(restoreDistillery(original));
  assert.equal(result.coverage.complete,false);
  assert.equal(result.coverage.fromMonth,26);
  assert.equal(result.coverage.townFromMonth,null);
  assert.ok(result.timeline.some(row=>row.kind==='bottling'));
  assert.ok(result.timeline.every(row=>row.generationId===null && row.completeness==='retained-record'));
  assert.ok(!result.timeline.some(row=>row.kind==='sale' || row.kind==='distillation'));
});
