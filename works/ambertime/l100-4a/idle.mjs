// Town-only no-new-delivery experiment; NOT a formal full-game idle save.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {expandFormalGame,assertFormalSize} from '../save-codec.mjs';
import {advanceTown} from '../town-connection.mjs';
import {hash} from './research.mjs';
const [dir,out]=process.argv.slice(2);assert(dir&&out);const rows=[];
for(const policy of ['local','mixed','wide']){const file=path.join(dir,`${policy}-100-year-1200-v8.json`),raw=fs.readFileSync(file,'utf8'),g=JSON.parse(expandFormalGame(JSON.parse(raw).game)),t=g.labConnection.town,start=JSON.stringify(g).length,groups=Object.fromEntries(['events','arrivals','attempts','seen','shipments','releases'].map(k=>[k,JSON.stringify(t[k]).length]));
 for(let i=0;i<12;i++){advanceTown(t,t.month+1);assertFormalSize(JSON.stringify(g));}
 rows.push({policy,method:'Town clock only for12 months; no new external receipts, releases or distillation. Not a valid advanced formal game save.',startUnits:start,endUnits:JSON.stringify(g).length,deltaUnits:JSON.stringify(g).length-start,groupsDelta:Object.fromEntries(Object.keys(groups).map(k=>[k,JSON.stringify(t[k]).length-groups[k]])),inputSha256:hash(raw),sourceUnchanged:hash(fs.readFileSync(file,'utf8'))===hash(raw)});}
fs.writeFileSync(out,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
