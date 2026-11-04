// Offline only. Supply the exact H0 saves, or regenerate with the H0 scenarios.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {extractConnections} from './connections.mjs';

const h0 = JSON.parse(readFileSync(new URL('../history-lab/fixtures.json',import.meta.url),'utf8'));
const h0Digests = {
  local:'2550ee79b65d2aa241cef2ec0fed8b4137d69d10323a24556e9ebeeb1f90e7e1',
  wide:'a86c22856bf04b35444d8506cb5e6a8c912a011f049ea4040f0e7d1413a8fe4d',
  mixed:'0196980a551cb4e8d7e7162f506616e8812bd95bc88ccca51cac8919514a5439',
};
const [directory, scenario] = process.argv.slice(2);
const result = {};
for (const {id,seed,analysis} of h0.filter(row=>!scenario || row.id===scenario)) {
  const raw = directory && directory !== '-' ? readFileSync(resolve(directory,id+'-360.json'),'utf8') :
    JSON.stringify(simulateScenario(id,360).game);
  const sourceSha256 = createHash('sha256').update(raw).digest('hex');
  assert.equal(sourceSha256,h0Digests[id],id+' H0 source SHA-256');
  const state = JSON.parse(raw);
  assert.equal(state.seed,seed);
  assert.equal(state.core.month,analysis.elapsedMonths);
  assert.equal(state.core.totals.bottlesSold,analysis.totals.sold);
  result[id] = {sourceSha256,...extractConnections(state,analysis)};
  assert.equal(JSON.stringify(state),raw,id+' source unchanged');
}
assert.ok(Object.keys(result).length,'Unknown H0 scenario');
console.log(JSON.stringify(result));
