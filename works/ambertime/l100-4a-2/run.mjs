import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {ArrivalView,install,hydrate} from './accessor.mjs';import {expandFormalGame,compactFormalGame} from '../save-codec.mjs';import {advanceTown} from '../town-connection.mjs';import {mapProgress} from '../world-map-view.mjs';import * as D from '../partner-orders.mjs';
const [dir,out]=process.argv.slice(2),hash=s=>createHash('sha256').update(s).digest('hex');
const result={runtime:process.version,base:'28f00c81cb1b374758da34dc79cf7f63dfe657c2',scope:'Node snapshot reconstruction and LIVE unmodified advanceTown; NOT compact full distillery runtime, formal replay or browser',rows:[]};
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('-v8.json')).sort()){
 const raw=fs.readFileSync(path.join(dir,file),'utf8'),session=JSON.parse(raw),formal=expandFormalGame(session.game),original=JSON.parse(formal),row={file,inputSha256:hash(raw),month:original.core.month,formalUnits:formal.length,arrivalUnits:JSON.stringify(original.labConnection.town.arrivals).length,methods:{}};
 for(const mode of ['A','B','C']){
  const timings=[];let game;
  for(let run=0;run<3;run++){
   game=JSON.parse(formal);global.gc?.();const memoryBefore=process.memoryUsage(),before=memoryBefore.heapUsed,t0=performance.now();if(mode!=='A')install(game,mode);const constructMs=performance.now()-t0;global.gc?.();const memoryAfter=process.memoryUsage(),heapAfter=memoryAfter.heapUsed,retainedDeltaBytes=heapAfter-before,v=game.labConnection.town.arrivals;
   let t=performance.now();for(let i=0;i<100;i++){const e=mode==='A'?v[Math.floor(v.length/2)]:v.at(Math.floor(v.length/2));assert(e);}const single100Ms=performance.now()-t;
   t=performance.now();let count=0;for(const e of v){assert(e.id);count++;}const scanMs=performance.now()-t;assert.equal(count,original.labConnection.town.arrivals.length);
   t=performance.now();const id=original.labConnection.town.arrivals.at(-1).id;for(let i=0;i<20;i++)assert(mode==='A'?v.find(e=>e.id===id):v.byId(id));const id20Ms=performance.now()-t;
   t=performance.now();assert.equal(JSON.stringify(mode==='A'?game:hydrate(game)),formal);const equalityMs=performance.now()-t;
   timings.push({run,constructMs,memoryBefore,memoryAfter,heapAfter,retainedDeltaBytes,single100Ms,scanMs,id20Ms,equalityMs});
  }
  const v=game.labConnection.town.arrivals;let i=0;for(const e of v){assert.deepEqual(e,original.labConnection.town.arrivals[i]);if(mode!=='A'){assert.equal(v.at(i),e);assert.equal(v.byId(e.id),e);}i++;}
  const control=JSON.parse(formal),months=12,monthly=[];
  for(let n=0;n<months;n++){const next=control.labConnection.town.month+1;advanceTown(control.labConnection.town,next);const before=process.memoryUsage().heapUsed,t=performance.now();advanceTown(game.labConnection.town,next);monthly.push({ms:performance.now()-t,heapDeltaBytes:process.memoryUsage().heapUsed-before});if(mode!=='A')v.validate();assert.equal(JSON.stringify(mode==='A'?game:hydrate(game)),JSON.stringify(control));}
  const reconstructed=mode==='A'?game:hydrate(game),t=performance.now(),wire=compactFormalGame(JSON.stringify(reconstructed));const compactMs=performance.now()-t;assert.equal(expandFormalGame(wire),JSON.stringify(reconstructed));
  let fullModelBoundary=null;if(mode!=='A'){try{D.tickDistillery(install(JSON.parse(formal),mode));fullModelBoundary='unexpected success; not certified';}catch(e){fullModelBoundary=String(e.message);}}
  row.methods[mode]={timings,monthly,orderedValues:true,wholeGameReconstruction:true,liveTownMonths:months,liveFullModel:false,existingSessionHistoryUnchanged:true,mapAfterExplicitHydrationEqual:JSON.stringify(mapProgress(reconstructed))===JSON.stringify(mapProgress(control)),directMap:mode==='A'?'baseline':JSON.stringify(mapProgress(game)),index:mode==='A'?null:v.stats(),compactMs,compactGameUnits:JSON.stringify(wire).length,formalCapChanged:false,fullModelBoundary};
 }
 assert.equal(hash(fs.readFileSync(path.join(dir,file),'utf8')),row.inputSha256);result.rows.push(row);fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(file);
}
