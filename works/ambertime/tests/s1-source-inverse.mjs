import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Only S1's explicitly reviewed hunks are removed. Unrelated bytes continue
// into the original historical oracles; evidence hashes are never replaced.
const changes=JSON.parse(readFileSync(new URL('./s1-source-inverse.json',import.meta.url),'utf8'));
export function beforeS1(source,name){
 const entry=changes[name];if(!entry)return source;
 for(const {before,after} of entry.hunks){
  assert.equal(source.split(after).length-1,1,'exact reviewed S1 hunk: '+name);
  source=source.replace(after,before);
 }
 return source;
}
