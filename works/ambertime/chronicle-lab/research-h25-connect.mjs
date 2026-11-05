// Regenerate the small published snapshot delta from full offline raw facts.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {withReputationCandidates} from './facts-d.mjs';
import {prepareRecallSnapshots,withRecallSnapshots} from './recall-snapshots.mjs';
import {buildHistoricalChronicle} from './recall-boundary.mjs';
import {buildChronicle} from './editor.mjs';

const load = path=>JSON.parse(readFileSync(path,'utf8'));
const [rawDirectory,longDirectory] = process.argv.slice(2);
assert.ok(rawDirectory && longDirectory,'Supply H25 raw and H24 candidate directories');
const base = load(new URL('./facts.json',import.meta.url));
const additions = load(new URL('./facts-d.json',import.meta.url));
const snapshots = {}, long = {records:{},recalls:{}};
for (const id of ['local','wide','mixed']) {
  for (const months of [360,1200]) {
    const raw = load(resolve(rawDirectory,id+'-'+months+'.json')).record;
    const shared = months===360 ? withReputationCandidates(base[id],additions[id]) :
      load(resolve(longDirectory,id+'-'+months+'.json')).record;
    const supplement = prepareRecallSnapshots(raw,shared);
    const connected = withRecallSnapshots(shared,supplement);
    for (const snapshot of supplement.snapshots) {
      const expected = buildHistoricalChronicle(raw,'handover',{handoverId:snapshot.handoverId});
      const actual = buildChronicle(connected,'handover','d',{handoverId:snapshot.handoverId});
      assert.deepEqual(actual.frames,expected.frames);
      assert.deepEqual(actual.audit,expected.audit);
    }
    assert.deepEqual(buildChronicle(connected,'anniversary','d'),buildChronicle(shared,'anniversary','d'));
    if (months===360) snapshots[id]=supplement;
    else {
      long.records[id]=shared;
      long.recalls[id]=supplement;
    }
  }
}
writeFileSync(new URL('./facts-recalls.json',import.meta.url),JSON.stringify(snapshots)+'\n');
writeFileSync(new URL('./facts-recalls-long.json',import.meta.url),JSON.stringify(long)+'\n');
