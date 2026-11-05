// Reviewed failure-presentation-only inverse. It preserves unrelated bytes for
// historical pins; exact mode binds normal-path evidence reuse to whole files.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const deltas=JSON.parse(readFileSync(new URL('./recovery-source-inverse.json',import.meta.url),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
export function beforeRecovery(source,name,{exact=false}={}){
 const delta=deltas[name];if(!delta)return source;
 if(exact)assert([delta.beforeSha256,delta.afterSha256].includes(sha(source)),'exact reviewed B2 recovery source: '+name);
 if(delta.hunks.every(h=>source.split(h.before).length-1===1)&&!delta.hunks.some(h=>source.includes(h.after)))return source;
 for(const h of delta.hunks){assert.equal(source.split(h.after).length-1,1,'exact reviewed B2 recovery hunk: '+name);source=source.replace(h.after,h.before);}
 if(exact)assert.equal(sha(source),delta.beforeSha256,'exact reviewed B2 recovery base: '+name);
 return source;
}
