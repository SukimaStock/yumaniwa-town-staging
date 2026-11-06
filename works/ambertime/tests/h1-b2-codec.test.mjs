import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {serializeSession,readSession,isCompactSession,copyToFormal,FORMAL_SAVE_KEY,PLACEMENT_SAVE_KEY} from '../placement-save.mjs';
import {compactFormalGame,expandFormalGame,MAX_FORMAL_CODE_UNITS,MAX_SESSION_CODE_UNITS} from '../save-codec.mjs';
const ui={userPaused:true,elapsed:200},options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const fixtureRaw=JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const fixture=()=>D.restoreDistillery(fixtureRaw);
const edit=(text,fn)=>{const parsed=JSON.parse(text);fn(parsed);return JSON.stringify(parsed);};
test('formal compact session uses the startup reader and restores exact game, pause and clock',()=>{
 const game=fixture(),raw=D.serializeDistillery(game),before=JSON.stringify(game);let calls=0;
 const text=serializeSession(game,ui,{...options,restore:raw=>{calls++;return D.restoreDistillery(raw);}});
 assert.equal(calls,1);assert(isCompactSession(text));assert(!isCompactSession('{'));assert(!isCompactSession(JSON.stringify({version:2})));
 const saved=JSON.parse(text);assert.deepEqual(Object.keys(saved),['version','game','userPaused','elapsed','caskSlots','recentLedger']);assert.equal(saved.version,5);assert.equal(saved.game.labConnection.town.arrivals,null);
 const loaded=readSession(text,options);assert.equal(D.serializeDistillery(loaded.game),raw);assert.equal(loaded.elapsed,ui.elapsed);assert.equal(loaded.userPaused,ui.userPaused);assert.equal(JSON.stringify(game),before);
 assert.equal(serializeSession(loaded.game,ui,options),text);
 const events=loaded.game.labConnection.town.events,arrivals=loaded.game.labConnection.town.arrivals;for(const arrival of arrivals)assert.notEqual(arrival,events.find(e=>e.id===arrival.id));
});
test('old v2 session still loads via unchanged official reader without altering source text',()=>{
 const game=fixture(),text=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(game)),...ui}),before=text;let calls=0;
 const out=readSession(text,{...options,restore:raw=>{calls++;return D.restoreDistillery(raw);}});assert.equal(calls,1);assert.equal(JSON.stringify(out.game),JSON.stringify(game));assert.equal(text,before);
 assert.equal(readSession(' '+text+'\n',options).elapsed,ui.elapsed);
});
test('strict C encoder refuses incomplete or reordered arrivals without normalizing input',()=>{
 const original=JSON.parse(fixtureRaw);assert(original.labConnection.town.arrivals.length>1);
 for(const change of [t=>t.arrivals.reverse(),t=>t.arrivals.pop(),t=>t.arrivals.push(t.arrivals[0]),t=>t.arrivals[0].id='missing',t=>t.arrivals[0].strength=-1,t=>t.events.push(t.events[0])]){
  const game=structuredClone(original);change(game.labConnection.town);const raw=JSON.stringify(game);assert.throws(()=>compactFormalGame(raw));assert.equal(JSON.stringify(game),raw);
 }
});
test('current compact envelope rejects malformed marker, envelope, duplicates, metadata and noncanonical input before formal restore',()=>{
 const text=serializeSession(fixture(),ui,options);let calls=0;const injected={...options,restore:()=>{calls++;throw Error('must not call');}};
 for(const change of [s=>s.version=6,s=>s.extra=true,s=>delete s.elapsed,s=>s.elapsed=1,s=>s.userPaused=1,s=>s.game.labConnection.town.arrivals=[],s=>delete s.game.labConnection.town.arrivals,s=>s.game.labConnection.town.events.push(s.game.labConnection.town.events[0])])assert.throws(()=>readSession(edit(text,change),injected));
 for(const bad of [text+'\n',' '+text,text.replace('"version":5','"version":5,"version":5')])assert.throws(()=>readSession(bad,injected));assert.equal(calls,0);
});
test('expanded size guard matches official boundary and rejects before cloning or reader bypass',()=>{
 assert.equal(MAX_FORMAL_CODE_UNITS,6016384);assert.equal(MAX_FORMAL_CODE_UNITS,P.maxSaveBytes*4+16384);
 const compact={version:20,placement:{version:1},labConnection:{town:{events:[{id:'e1',type:'arrival',body:'x'.repeat(3010000)}],arrivals:null}}};
 let calls=0;const text=JSON.stringify({version:3,game:compact,...ui});assert(text.length<MAX_SESSION_CODE_UNITS);assert.throws(()=>readSession(text,{...options,restore:()=>{calls++;return compact;}}),/大きすぎます/);assert.equal(calls,0);
 assert.throws(()=>compactFormalGame(' '.repeat(MAX_FORMAL_CODE_UNITS)),/大きすぎます/);assert.throws(()=>readSession('x'.repeat(MAX_SESSION_CODE_UNITS),options));
});
test('save candidate is rejected when official restore refuses or changes the formal state',()=>{
 const game=fixture();assert.throws(()=>serializeSession(game,ui,{...options,restore:()=>{throw Error('formal rejected');}}),/formal rejected/);
 assert.throws(()=>serializeSession(game,ui,{...options,restore:raw=>({...JSON.parse(raw),extra:true})}),/一致しません/);
});
test('source copy may encode v5 without mutating either older source or unrelated storage',()=>{
 const game=fixture(),old=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(game)),...ui}),values=new Map([[PLACEMENT_SAVE_KEY,old],['unrelated','keep']]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const result=copyToFormal(storage,{id:'placement',key:PLACEMENT_SAVE_KEY,raw:old},{...options,encodeSession:(game,ui)=>serializeSession(game,ui,options)});
 assert(isCompactSession(result.text));assert.equal(values.get(FORMAL_SAVE_KEY),result.text);assert.equal(values.get(PLACEMENT_SAVE_KEY),old);assert.equal(values.get('unrelated'),'keep');assert.equal(JSON.stringify(readSession(result.text,options).game),JSON.stringify(game));
});
