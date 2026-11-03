'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const lifecycle = require('../tools/work-lifecycle.cjs');
const renderer = require('../tools/lab-renderer.cjs');
const research = require('../tools/ambertime-research.cjs');
const root = path.resolve(__dirname, '..');
const BASE = '632968a80b81ea1478012073b2de9a0f6e525183';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 30e6 });
const read = () => JSON.parse(fs.readFileSync(path.join(root, research.FILE)));
const works = lifecycle.listWorks(root, lifecycle.readRegistry(root));
const esc = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
test('L1 preserves all 39 asset entries, 38 screens and 29 registered entrances', () => {
  const rows = research.readResearch(root, works).records;
  const original = fs.readFileSync(path.join(root,'works/ambertime/design/structure-audit-2026-11-02/LAB-INVENTORY.md'),'utf8').split('\n').filter(line => /^\| `works\//.test(line)).slice(0,39);
  assert.equal(rows.length,39);
  assert.deepEqual(rows.map(row=>row.source).sort(),original.map(line=>line.match(/`([^`]+)`/)[1]).sort());
  assert.equal(rows.filter(row=>row.work).length,29);
  assert.equal(rows.filter(row=>row.protection).length,24);
  assert.equal(rows.filter(row=>row.display==='active').length,4);
  assert.equal(rows.filter(row=>row.display==='review').length,5);
  assert.equal(rows.filter(row=>row.display==='record').length,30);
  for(const row of rows) assert.ok(git('show',BASE+':'+row.source).equals(fs.readFileSync(path.join(root,row.source))),row.source);
});
test('historical registration remains assigned; uncertain records remain on the normal bench', () => {
  const rows=research.readResearch(root,works).records, rooms=renderer.readRooms(root,works);
  const html=lifecycle.renderLab(root,lifecycle.readRegistry(root));
  for(const row of rows.filter(row=>row.work)) {
    const machine=rooms.flatMap(room=>room.machines).find(machine=>machine.work?.id===row.work);
    assert.ok(machine,row.work);
    assert.equal(!!machine.stored,row.display==='record',row.work);
    assert.equal(html.includes('data-work-id="'+row.work+'"'),row.display!=='record',row.work);
  }
  for(const row of rows.filter(row=>!row.work&&row.display!=='record')) assert.ok(html.includes('../'+row.source));
  assert.match(html,/href="\.\/ambertime-research.html">研究記録/);
});
test('all non-AmberTime machine cards and all other room panels remain byte identical', () => {
  const before=git('show',BASE+':lab/index.html').toString(), after=lifecycle.renderLab(root,lifecycle.readRegistry(root));
  const cards=html=>[...html.matchAll(/<li class="machine[^]*?<\/li>/g)].map(m=>m[0]).filter(s=>!s.includes('AmberTime')&&!s.includes('ambertime'));
  assert.deepEqual(cards(after),cards(before));
  for(const id of ['motion','touch','pumpoko','observation','archive','garage']) {
    const section=html=>html.match(new RegExp('<section class="room-panel" id="room-'+id+'"[^]*?<\\/section>'))[0];
    assert.equal(section(after),section(before),id);
  }
});
test('research rejects duplicate, unsafe or missing entries, missing evidence and copied lifecycle fields', () => {
  for(const mutate of [
    data=>data.records.push(data.records[0]),
    data=>{data.records[0].source='works/ambertime/../secret.html';},
    data=>{data.records[0].source='works/ambertime/missing.html';},
    data=>{data.records[0].references=['https://example.com/'];},
    data=>{data.records[0].status='frozen';},
    data=>{data.records[0].findings='';},
    data=>{data.records[0].dependencies=['works/ambertime/missing.mjs'];},
    data=>{data.records[0].work='pumpoko';}
  ]) { const data=read();mutate(data);assert.throws(()=>research.readResearch(root,works,data),/Research:/); }
});
test('research escapes content, resolves lifecycle identity, preserves local links and both generated outputs', () => {
  const rows=research.readResearch(root,works);
  const html=research.renderResearch(root,rows,esc);
  assert.equal(html,fs.readFileSync(path.join(root,research.OUTPUT),'utf8'));
  assert.equal(lifecycle.renderLab(root,lifecycle.readRegistry(root)),fs.readFileSync(path.join(root,'lab/index.html'),'utf8'));
  for(const href of [...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(h=>!h.startsWith('https:')&&!h.startsWith('#'))) {
    let file=path.resolve(root,'lab',href.split(/[?#]/)[0]);
    if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
    assert.ok(fs.statSync(file).isFile(),href);
  }
  const malicious={...rows,records:rows.records.map(r=>({...r,purpose:'<img onerror="x">'}))};
  assert.ok(!research.renderResearch(root,malicious,esc).includes('<img onerror='));
});
test('main and Lab source trees including seven dependency files and original redirects are unchanged', () => {
  const protectedPaths=['works/ambertime/experiments/reputation/v03/model.mjs','works/ambertime/experiments/reputation/v05/core.mjs','works/ambertime/experiments/reputation/v05/model.mjs','works/ambertime/experiments/town-simulation/v01/model.mjs','works/ambertime/experiments/world-map/v01/map.mjs','works/ambertime-flavor-lab-v02/model.mjs','works/ambertime-flavor-lab-v02/bridge.mjs'];
  for(const file of protectedPaths)assert.ok(git('show',BASE+':'+file).equals(fs.readFileSync(path.join(root,file))),file);
  const files=git('ls-tree','-r','--name-only',BASE,'--','works/ambertime','works/ambertime-cut-lab','works/ambertime-flavor-lab-v02','works/ambertime-word-crafting-lab').toString().trim().split('\n');
  for(const file of files) assert.ok(git('show',BASE+':'+file).equals(fs.readFileSync(path.join(root,file))),file);
  assert.ok(git('show',BASE+':data/work-lifecycle.json').equals(fs.readFileSync(path.join(root,'data/work-lifecycle.json'))));
});
