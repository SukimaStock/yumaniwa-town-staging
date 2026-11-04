import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {restoreDistillery,serializeDistillery} from '../partner-orders.mjs';

const hash = raw => createHash('sha256').update(raw).digest('hex');
const [mode,argument] = process.argv.slice(2);

if (mode==='restore') {
  assert.ok(argument,'Supply a formal save path.');
  const raw = readFileSync(argument,'utf8');
  const started = performance.now();
  const state = restoreDistillery(raw);
  const restoreMs = Math.round(performance.now()-started);
  assert.equal(serializeDistillery(state),raw,'Formal round-trip changed save bytes');
  console.log(JSON.stringify({
    sourceSha256:hash(raw),month:state.core.month,restoreMs,codeUnits:raw.length,
    bytes:Buffer.byteLength(raw),peakRssBytes:process.resourceUsage().maxRSS*1024,
  }));
} else {
  const id = mode, directory = argument;
  assert.ok(['local','wide','mixed'].includes(id) && directory,
    'Usage: node research-h24-saves.mjs <local|wide|mixed> <output directory> | restore <save path>');
  mkdirSync(directory,{recursive:true});
  // Cumulative time includes formal serialization and validation at each checkpoint.
  const started = performance.now();
  simulateScenario(id,1200,{
    checkpoints:[360,720,1080,1200],
    onCheckpoint(state,{fills,forcedBottlings}) {
      const raw = serializeDistillery(state);
      const month = state.core.month;
      const file = resolve(directory,`${id}-${month}.json`);
      writeFileSync(file+'.tmp',raw);
      renameSync(file+'.tmp',file);
      console.log(JSON.stringify({
        id,month,seed:state.seed,playMs:Math.round(performance.now()-started),
        sourceSha256:hash(raw),codeUnits:raw.length,bytes:Buffer.byteLength(raw),
        operations:state.operations.length,records:state.records.length,fills,forcedBottlings,
        brands:state.brands.map(({id,name})=>({id,name})),releases:state.releases.length,
        deliveries:state.shop.deliveries.length,bottlesSold:state.core.totals.bottlesSold,
        townEvents:state.labConnection.town.events.length,
        handovers:state.generations.completed.map(({id,endedMonth})=>({id,month:endedMonth})),
      }));
    },
  });
}
