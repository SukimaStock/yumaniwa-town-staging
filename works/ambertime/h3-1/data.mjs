import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {withReputationCandidates} from '../chronicle-lab/facts-d.mjs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export function loadRecords(){
 const sources=[];
 const load=name=>{const b=fs.readFileSync(new URL('../chronicle-lab/'+name,import.meta.url));sources.push({path:'works/ambertime/chronicle-lab/'+name,sha256:sha(b),bytes:b.length});return JSON.parse(b);};
 const base=load('facts.json'),extra=load('facts-d.json'),recalls=load('facts-recalls.json'),long=load('facts-recalls-long.json');
 const records=[];
 for(const years of [30,100])for(const policy of ['local','wide','mixed'])records.push({years,policy,record:years===30?withRecallSnapshots(withReputationCandidates(base[policy],extra[policy]),recalls[policy]):withRecallSnapshots(long.records[policy],long.recalls[policy])});
 return {sources,records};
}
