// Offline only. Preserve the pre-C-3 stream from the existing research extractor.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const url = new URL('./research-h24-facts.mjs',import.meta.url);
const source = readFileSync(url,'utf8');
const seam = '  return {record,metrics:{';
assert.equal(source.split(seam).length,2,'Raw extraction seam changed');
const body = source.slice(0,source.indexOf('if (process.argv[1]')).replace(seam,'  return {rawEvents:events,record,metrics:{')
  .replace(/from '([.][^']+)'/gu,(_,path)=>'from '+JSON.stringify(new URL(path,url).href))
  .replace('new URL(name,import.meta.url)','new URL(name,'+JSON.stringify(url.href)+')');
const {buildLongRecord} = await import('data:text/javascript;base64,'+Buffer.from(body).toString('base64'));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [path,id] = process.argv.slice(2);
  assert.ok(path && id,'Usage: node research-h25-generate.mjs <formal-save> <scenario>');
  const text = readFileSync(path,'utf8');
  const state = JSON.parse(text);
  const {rawEvents,record,metrics} = buildLongRecord(state,id,createHash('sha256').update(text).digest('hex'));
  assert.equal(JSON.stringify(state),text);
  console.log(JSON.stringify({record:{...record,factStage:'uncompressed',events:rawEvents},metrics}));
}
