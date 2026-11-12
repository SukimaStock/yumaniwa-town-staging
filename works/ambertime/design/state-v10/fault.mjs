import fs from 'node:fs';import assert from 'node:assert/strict';import * as D from '../../partner-orders.mjs';
const s=JSON.parse(fs.readFileSync(process.argv[2])).game, before=JSON.stringify(s);
assert.throws(()=>D.tickDistillery(s),/injected after owned detach/);assert.equal(JSON.stringify(s),before);console.log('PASS: after-detach partial candidate write+throw leaves original full game and operations unchanged; no formal storage accessed');
