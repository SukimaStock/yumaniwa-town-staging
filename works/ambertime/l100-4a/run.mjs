import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {encode,hydrate,lookup,sizes,hash,text} from './research.mjs';
import {expandFormalGame} from '../save-codec.mjs';
import {advanceTown} from '../town-connection.mjs';
const args=process.argv.slice(2),output=args.shift();
if(!output||!args.length)throw Error('Usage: node run.mjs OUTPUT.json INPUT_DIRECTORY...');
const files=args.flatMap(dir=>fs.readdirSync(dir).filter(n=>n.endsWith('-v8.json')).map(n=>path.join(dir,n))).sort();
const result={method:'Node isolated research, not formal saves; full game JSON equality then same advanceTown(month+1) on original and hydrated copies. Future test covers town transition only. No browser, archive persistence, formal adoption or full future-equivalence proof.',runtime:process.version,formalCapExclusive:6016384,archiveAccounting:'totalUnits/currentBytes sum manifest+integrity and unique raw archive blobs. Transport envelope escaping reported separately. Database keys/index/transaction overhead unmeasured.',rows:[],duplicateInputs:[]};
const inputHashes=new Set();
for(const file of files){
 const raw=fs.readFileSync(file,'utf8'),sourceHash=hash(raw);
 if(inputHashes.has(sourceHash)){result.duplicateInputs.push({file:path.basename(file),sourceHash});continue;}inputHashes.add(sourceHash);
 const session=JSON.parse(raw),formal=expandFormalGame(session.game),game=JSON.parse(formal),t=game.labConnection.town;
 const row={file:path.basename(file),policy:path.basename(file).split('-')[0],month:game.core.month,sourceHash,formalUnits:formal.length,formalBytes:Buffer.byteLength(formal),townUnits:text(t).length,townBytes:Buffer.byteLength(text(t)),groups:{},methods:{}};
 for(const [k,v] of Object.entries(t))row.groups[k]={units:text(v).length,bytes:Buffer.byteLength(text(v)),count:Array.isArray(v)?v.length:null};
 const control=JSON.parse(formal);let start=performance.now();advanceTown(control.labConnection.town,t.month+1);row.controlTownNextMs=performance.now()-start;const future=text(control);
 for(const method of ['A','B','C','D']){
  start=performance.now();const encoded=encode(game,method),encodeMs=performance.now()-start;
  start=performance.now();const restored=hydrate(encoded),hydrateMs=performance.now()-start;
  assert.equal(text(restored),formal,`${file}/${method} JSON`);
  let lazy=null;if(method==='D'&&t.events.length){start=performance.now();assert.equal(text(lookup(encoded,'events',t.events.length-1)),text(t.events.at(-1)));lazy={index:t.events.length-1,ms:performance.now()-start,exact:true};}
  start=performance.now();advanceTown(restored.labConnection.town,t.month+1);const nextTownMs=performance.now()-start;assert.equal(text(restored),future,`${file}/${method} future`);
  row.methods[method]={...sizes(encoded),encodeMs,hydrateMs,nextTownMs,fullJsonEqual:true,townNextFullJsonEqual:true,lazy};
 }
 assert.equal(hash(fs.readFileSync(file,'utf8')),sourceHash);row.sourceUnchanged=true;result.rows.push(row);fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({file:row.file,month:row.month,formal:row.formalUnits,A:row.methods.A.totalUnits,B:row.methods.B.totalUnits,C:row.methods.C.totalUnits,D:row.methods.D.totalUnits,Dcurrent:row.methods.D.currentUnits}));
}
