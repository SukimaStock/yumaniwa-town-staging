// Independent small-input review probes; not a product/runtime test entrypoint.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {encode, anchor, hash, validateCandidate} from '../../s3-d1/codec.mjs';
const {compareCandidate}=await import(process.env.AMBER_REVIEW_COMPARATOR_URL??'../compare.mjs');

const directory=fs.mkdtempSync(fileURLToPath(new URL('./reviewer-temporary-',import.meta.url)));
let serial=0;
const reference=text=>{const p=`${directory}/${serial++}.json`;fs.writeFileSync(p,text);return p};
const domain=x=>JSON.parse(JSON.stringify(x));
const base=()=>domain({game:{labConnection:{town:{events:[],attempts:[],arrivals:[]}}},userPaused:false,elapsed:0,caskSlots:[],recentLedger:{},historyRecord:{},recallRecord:{}});
function full(x,options={}){
 const c=encode(x),a=anchor(x),scope=options.scope??'input',text=JSON.stringify(scope==='game'?x.game:x),before=JSON.stringify(c);
 const result=compareCandidate(c,a,{referenceFile:reference(text),...options});
 assert.equal(result.outputSha,hash(text));assert.equal(result.gameSha,a.gameSha);assert.equal(result.units,text.length);assert.equal(result.bytes,Buffer.byteLength(text));assert.equal(JSON.stringify(c),before);return result;
}
function freeze(x){if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x)}return x}
function reseal(c,a){const {integrity,...body}=c;c.integrity=hash(body);a.candidateSha=hash(c)}

test('empty histories, six sidecars, frozen candidate and both scopes',()=>{
 const x=base(),c=freeze(encode(x)),a=anchor(x);
 for(const scope of ['input','game']){const text=JSON.stringify(scope==='game'?x.game:x);assert.equal(compareCandidate(c,a,{referenceFile:reference(text),scope,chunkUnits:1}).outputSha,hash(text))}
});

test('Unicode values and keys, all controls, all surrogate pair classes, chunks 1 through 9',()=>{
 const x=base();const controls=Array.from({length:32},(_,i)=>String.fromCharCode(i)).join('');
 const values=['',controls,'"\\/','é町😀','\u2028\u2029','\ud800','\udbff','\udc00','\udfff','\ud800\udc00','\udbff\udfff','\ud800\ud800\udc00\udc00'];
 x.extra=Object.fromEntries(values.map((v,i)=>[`${v}key${i}`,v]));
 for(let chunkUnits=1;chunkUnits<=9;chunkUnits++)full(domain(x),{chunkUnits});
});

test('native numeric representations and nested arrays',()=>{
 const x=base();x.extra=[0,1,-1,1e-7,-1e-7,1e-6,1e20,1e21,Number.MIN_VALUE,Number.MAX_VALUE,9007199254740992,[],[{},null,true,false,[0.1+0.2]]];
 full(domain(x),{chunkUnits:1});
});

test('schema and town integer-index reordering matches native object enumeration',()=>{
 const x=base(),town=x.game.labConnection.town;
 town.events=[domain({id:'e1',type:'arrival',sourceId:null,'7':7,'0':0,'4294967294':4,'4294967295':5,'00':'zero',tail:'last'})];town.arrivals=[town.events[0]];
 Object.assign(town,{'10':'ten','2':'two','01':'one'});
 const c=encode(x),a=anchor(x),s=c.events.schemas[0],row=c.events.rows[0],values=new Map(s.map((key,i)=>[key,row[i+2]]));
 const numeric=s.filter(k=>['0','7','4294967294'].includes(k));const rest=s.filter(k=>!numeric.includes(k));
 c.events.schemas[0]=[...rest,...numeric.reverse()];c.events.rows[0]=[0,0,...c.events.schemas[0].map(k=>values.get(k))];
 const townNumeric=c.townKeys.filter(k=>['2','10'].includes(k));c.townKeys=[...c.townKeys.filter(k=>!townNumeric.includes(k)),...townNumeric.reverse()];reseal(c,a);
 assert.equal(compareCandidate(c,a,{referenceFile:reference(JSON.stringify(x)),chunkUnits:2}).equal,true);
});

test('arrivals resolve repeated event data without JSON parse or comparator input mutation',()=>{
 const x=base(),town=x.game.labConnection.town;town.events=[{id:'e1',type:'release',month:1},{id:'e2',type:'arrival',sourceId:'e1',month:2,meta:{list:['町',null]}},{id:'e3',type:'arrival',sourceId:'e2',month:3,meta:[]}];town.attempts=[{sourceId:'e3',month:4}];town.arrivals=[town.events[1],town.events[2]];
 const c=freeze(encode(domain(x))),a=anchor(x),p=reference(JSON.stringify(x)),parse=JSON.parse;
 JSON.parse=()=>{throw new Error('comparison must not parse/clone histories')};
 try{assert.equal(compareCandidate(c,a,{referenceFile:p,chunkUnits:3}).equal,true)}finally{JSON.parse=parse}
});

test('missing/null or non-index key order change cannot pass independent content comparison',()=>{
 const x=base();x.extra={before:null,after:1};
 for(const mutate of [c=>delete c.active.extra.before,c=>{c.active.extra={after:1,before:null}}]){
  const c=encode(x),a=anchor(x);mutate(c);reseal(c,a);
  assert.throws(()=>compareCandidate(c,a,{referenceFile:reference(JSON.stringify(x)),chunkUnits:1}),e=>e.stage==='content'&&Number.isSafeInteger(e.offsetUnits));
 }
});

test('first difference uses exact UTF16 offset after supplementary characters',()=>{
 const x=base();x.extra='😀é町z';const c=encode(x),a=anchor(x);c.active.extra='😀é町q';reseal(c,a);const text=JSON.stringify(x);
 assert.throws(()=>compareCandidate(c,a,{referenceFile:reference(text),chunkUnits:1}),e=>e.stage==='content'&&e.offsetUnits===text.indexOf('z')&&e.path==='$["extra"]'&&e.candidateUnit===113&&e.referenceUnit===122);
});

test('reference truncation and trailing data reject at exact endpoint',()=>{
 const x=base(),text=JSON.stringify(x);
 for(const changed of [text.slice(0,-1),text+'\n']){const a=anchor(x);a.inputSha=hash(changed);assert.throws(()=>compareCandidate(encode(x),a,{referenceFile:reference(changed),chunkUnits:1}),e=>e.stage==='content'&&e.offsetUnits===Math.min(text.length,changed.length))}
});

test('changing original between verification and comparison is refused',()=>{
 const x=base(),c=encode(x),a=anchor(x),text=JSON.stringify(x),p=reference(text),open=fs.openSync;let count=0;
 fs.openSync=function(name,...args){if(name===p&&++count===2)fs.writeFileSync(p,text.replace('false','true '));return open(name,...args)};
 try{assert.throws(()=>compareCandidate(c,a,{referenceFile:p}),e=>e.stage==='content'||e.stage==='independent-reference')}finally{fs.openSync=open}
});

test('invalid UTF8 must not compare equal to literal U+FFFD',()=>{
 const x=base();x.extra='�';const text=JSON.stringify(x),valid=Buffer.from(text),needle=Buffer.from('�'),index=valid.indexOf(needle),raw=Buffer.concat([valid.subarray(0,index),Buffer.from([0xff]),valid.subarray(index+needle.length)]),p=reference(raw),a=anchor(x);
 // Raw-byte anchor is deliberately changed so the output-byte guard is reached.
 a.inputSha=rawHash(raw);
 assert.throws(()=>compareCandidate(encode(x),a,{referenceFile:p,chunkUnits:1}),e=>e.stage==='independent-anchor');
});

test('incremental escaping must not stringify a full large key',()=>{
 const x=base();x['x'.repeat(32768)]=1;const c=encode(x),a=anchor(x),p=reference(JSON.stringify(x)),stringify=JSON.stringify;let largest=0;
 JSON.stringify=function(value,...args){if(typeof value==='string')largest=Math.max(largest,value.length);return stringify(value,...args)};
 try{const r=compareCandidate(c,a,{referenceFile:p,chunkUnits:7});assert.equal(r.equal,true);assert.ok(largest<=16384,`full scalar key JSON.stringify observed: ${largest} UTF16 units`)}finally{JSON.stringify=stringify}
});

test('short regular-file reads must not turn a buffered UTF8 prefix into EOF',()=>{
 const x=base();x.extra='é町😀';const c=encode(x),a=anchor(x),p=reference(JSON.stringify(x)),read=fs.readSync;
 fs.readSync=function(fd,buffer,offset,length,position){return read(fd,buffer,offset,Math.min(length,1),position)};
 try{assert.equal(compareCandidate(c,a,{referenceFile:p,chunkUnits:7}).equal,true)}finally{fs.readSync=read}
});

test('real 64KiB reference read boundaries preserve split UTF8 characters',()=>{
 for(const target of [65533,65534,65535]){
  const x=base();x.extra='MARK';const prefix=JSON.stringify(x).split('MARK')[0];x.extra='x'.repeat(target-Buffer.byteLength(prefix))+'😀é町';
  full(x,{chunkUnits:16384});
 }
});

test('long-key mismatch preserves exact offset and explicitly marks bounded path',()=>{
 const x=base(),key='a'.repeat(32768);x[key]='before';const c=encode(x),a=anchor(x);c.active[key]='after';reseal(c,a);const text=JSON.stringify(x);
 assert.throws(()=>compareCandidate(c,a,{referenceFile:reference(text),chunkUnits:7}),e=>e.stage==='content'&&e.offsetUnits===text.indexOf('before')&&e.path.includes('<truncated-key-units:32768>'));
});

test('strict candidate faults are rejected before a reference open',()=>{
 const x=base(),town=x.game.labConnection.town;town.events=[{id:'e1',type:'release',month:1,releaseId:1},{id:'e2',type:'arrival',sourceId:'e1',month:2,releaseId:1}];town.arrivals=[town.events[1]];town.attempts=[{sourceId:'e2',month:3}];
 const cell=(c,index,key,value)=>{const row=c.events.rows[index];row[c.events.schemas[row[1]].indexOf(key)+2]=value};
 const mutations=[c=>c.events.schemas[0].push('id'),c=>cell(c,1,'sourceId','e2'),c=>cell(c,1,'month',0),c=>cell(c,1,'releaseId',2),c=>c.arrivals.push(1),c=>c.townKeys.push('events'),c=>c.attempts.rows[0].push(null),c=>c.active.game.labConnection.town.events=[]];
 for(const mutate of mutations){const c=encode(x),a=anchor(x);mutate(c);reseal(c,a);assert.throws(()=>compareCandidate(c,a,{referenceFile:`${directory}/definitely-missing`}),e=>['structure','reference'].includes(e.stage))}
});

test('deterministic JSON-derived differential corpus',()=>{
 let seed=0x734f2a19;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
 const strings=['','text','é町😀','\ud800','\udfff','\u0000\r\n\t','"\\','4294967295','01','__proto__','constructor'];
 function value(depth){switch(next()%(depth?6:4)){case 0:return null;case 1:return !!(next()%2);case 2:return (next()%2?-1:1)*next()/10**(next()%10);case 3:return strings[next()%strings.length];case 4:return Array.from({length:next()%5},()=>value(depth-1));default:return Object.fromEntries(Array.from({length:next()%5},(_,i)=>[strings[next()%strings.length]+i,value(depth-1)]))}}
 for(let i=0;i<64;i++){const x=base();x.extra=value(3);x.game.extra=value(2);full(domain(x),{chunkUnits:1+next()%19,scope:i%2?'input':'game'})}
});

// These content-layer probes deliberately adjust only the relevant test anchor.
// Production callers must keep independently established anchors unchanged.
for(const positionName of ['first','middle','last'])test(`content layer rejects exact ${positionName} reference unit independently of prechecks`,()=>{
 const x=base();x.extra='x'.repeat(200);const candidate=freeze(encode(x)),text=JSON.stringify(x);
 const offset=positionName==='first'?0:positionName==='middle'?Math.floor(text.length/2):text.length-1;
 const changed=text.slice(0,offset)+(text[offset]==='X'?'Y':'X')+text.slice(offset+1),a=anchor(x);
 // Match the deliberately changed reference, retaining original candidate/game anchors.
 a.inputSha=hash(changed);assert.equal(validateCandidate(candidate,a),true);
 const p=reference(changed);assert.equal(hash(fs.readFileSync(p,'utf8')),a.inputSha);
 for(const chunkUnits of [1,7,16384])assert.throws(()=>compareCandidate(candidate,a,{referenceFile:p,chunkUnits}),e=>e.stage==='content'&&e.message==='independent content mismatch'&&e.offsetUnits===offset&&e.candidateUnit===text.charCodeAt(offset)&&e.referenceUnit===changed.charCodeAt(offset));
});

for(const [positionName,index]of [['first',0],['middle',2],['last',4]])test(`content layer rejects changed ${positionName} historical record independently of candidate anchor`,()=>{
 const x=base();x.game.labConnection.town.events=Array.from({length:5},(_,i)=>({id:`e${i+1}`,type:'release',month:i,label:`record-${i}-before`}));
 const text=JSON.stringify(x),candidate=encode(x),a=anchor(x),row=candidate.events.rows[index],column=candidate.events.schemas[row[1]].indexOf('label')+2;
 row[column]=`record-${index}-after`;reseal(candidate,a);assert.equal(validateCandidate(candidate,a),true);
 const p=reference(text),offset=text.indexOf(`record-${index}-before`)+`record-${index}-`.length;
 for(const chunkUnits of [1,7,16384])assert.throws(()=>compareCandidate(candidate,a,{referenceFile:p,chunkUnits}),e=>e.stage==='content'&&e.message==='independent content mismatch'&&e.offsetUnits===offset&&e.path===`$["game"]["labConnection"]["town"]["events"][${index}]["label"]`);
});

for(const sidecar of ['userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'])test(`content layer rejects reference truncation inside ${sidecar} independently of prechecks`,()=>{
 const x=base();Object.assign(x,{userPaused:false,elapsed:1200,caskSlots:['cask-0','cask-1'],recentLedger:{note:'ledger text'},historyRecord:{note:'history text'},recallRecord:{note:'recall text'}});
 const text=JSON.stringify(x),marker=JSON.stringify(sidecar)+':',valueStart=text.indexOf(marker)+marker.length,offset=valueStart+1;
 assert.ok(valueStart>=marker.length&&offset<text.length);
 const truncated=text.slice(0,offset),candidate=freeze(encode(x)),a=anchor(x);a.inputSha=hash(truncated);
 assert.equal(validateCandidate(candidate,a),true);const p=reference(truncated);assert.equal(hash(fs.readFileSync(p,'utf8')),a.inputSha);
 for(const chunkUnits of [1,7,16384])assert.throws(()=>compareCandidate(candidate,a,{referenceFile:p,chunkUnits}),e=>e.stage==='content'&&e.message==='reference ended before candidate'&&e.offsetUnits===offset&&e.path.startsWith(`$["${sidecar}"]`));
});

for(const fault of ['missing row','extra row','reordered rows'])test(`content layer rejects reference ${fault} independently of candidate structure`,()=>{
 const x=base();x.game.labConnection.town.events=Array.from({length:5},(_,i)=>({id:`e${i+1}`,type:'release',month:i,label:`record-${i}`}));
 const candidate=freeze(encode(x)),a=anchor(x),originalText=JSON.stringify(x),changed=domain(x),rows=changed.game.labConnection.town.events;
 if(fault==='missing row')rows.splice(2,1);
 else if(fault==='extra row')rows.push({id:'e6',type:'release',month:5,label:'extra record'});
 else [rows[1],rows[2]]=[rows[2],rows[1]];
 const changedText=JSON.stringify(changed);let offset=0;while(offset<Math.min(originalText.length,changedText.length)&&originalText[offset]===changedText[offset])offset++;
 assert.ok(offset<Math.min(originalText.length,changedText.length));a.inputSha=hash(changedText);assert.equal(validateCandidate(candidate,a),true);
 const p=reference(changedText);assert.equal(hash(fs.readFileSync(p,'utf8')),a.inputSha);
 for(const chunkUnits of [1,7,16384])assert.throws(()=>compareCandidate(candidate,a,{referenceFile:p,chunkUnits}),e=>e.stage==='content'&&e.message==='independent content mismatch'&&e.offsetUnits===offset&&e.path.startsWith('$["game"]["labConnection"]["town"]["events"]')&&e.candidateUnit===originalText.charCodeAt(offset)&&e.referenceUnit===changedText.charCodeAt(offset));
});

import {createHash} from 'node:crypto';
function rawHash(buffer){return createHash('sha256').update(buffer).digest('hex')}
test.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
