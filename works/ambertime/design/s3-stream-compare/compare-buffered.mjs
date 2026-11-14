// Independent B1 experiment. B0 and the D1-R codec remain byte-identical.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {validateCandidate} from '../s3-d1/codec.mjs';
import {hashFile} from './compare.mjs';
const MAX_UNITS=16384, READ_BYTES=65536;
const fail=(message,details={})=>{throw Object.assign(new Error(message),details)};
const keyPath=(path,key)=>`${path}[${JSON.stringify(key.slice(0,80))}]${key.length>80?`<truncated-key-units:${key.length}>`:''}`;
const isIndex=k=>{const n=Number(k);return Number.isInteger(n)&&n>=0&&n<4294967295&&String(n)===k};
const ordered=keys=>[...keys.filter(isIndex).sort((a,b)=>Number(a)-Number(b)),...keys.filter(k=>!isIndex(k))];
const classify=e=>e.message.startsWith('independent ')?'independent-anchor':e.message==='integrity'?'integrity':/source|arrival completeness/.test(e.message)?'reference':'structure';

// Callback traversal, not a generator pipeline. At most one layout per table cached.
function walkContents(c,scope,limit,emit,diagnostic=false){
 const send=(s,path,game)=>emit(s,path,game);
 function quoted(value,path,game){
  let buffer='"';
  for(let i=0;i<value.length;i++){
   const n=value.charCodeAt(i);let s=value[i];
   if(n===34)s='\\"';else if(n===92)s='\\\\';
   else if(n<32)s=({8:'\\b',9:'\\t',10:'\\n',12:'\\f',13:'\\r'})[n]??`\\u${n.toString(16).padStart(4,'0')}`;
   else if(n>=0xd800&&n<=0xdbff){const next=value.charCodeAt(i+1);if(next>=0xdc00&&next<=0xdfff)s+=value[++i];else s=`\\u${n.toString(16).padStart(4,'0')}`}
   else if(n>=0xdc00&&n<=0xdfff)s=`\\u${n.toString(16).padStart(4,'0')}`;
   buffer+=s;
   while(buffer.length>=limit){send(buffer.slice(0,limit),path,game);buffer=buffer.slice(limit)}
  }
  buffer+='"';while(buffer.length){send(buffer.slice(0,limit),path,game);buffer=buffer.slice(limit)}
 }
 const caches=[{schema:null,layout:null},{schema:null,layout:null}];
 function row(table,index,path,game){
  const values=table.rows[index],schema=table.schemas[values[1]],cache=caches[table===c.events?0:1];
  if(cache.schema!==schema){cache.schema=schema;cache.layout=ordered(schema).map(name=>[name,schema.indexOf(name)+2])}
  const layout=cache.layout;send('{',path,game);
  for(let j=0;j<layout.length;j++){
   const [name,position]=layout[j],p=diagnostic?keyPath(path,name):null;
   if(j)send(',',path,game);quoted(name,p,game);send(':',path,game);walk(values[position],p,game);
  }
  send('}',path,game);
 }
 function history(name,path,game){
  send('[',path,game);const length=name==='arrivals'?c.arrivals.length:c[name].rows.length;
  for(let i=0;i<length;i++){if(i)send(',',path,game);row(name==='arrivals'?c.events:c[name],name==='arrivals'?c.arrivals[i]:i,diagnostic?`${path}[${i}]`:null,game)}
  send(']',path,game);
 }
 function walk(value,path,game,location=null){
  const isTown=location==='town';
  if(value===null||typeof value==='boolean'||typeof value==='number'){send(JSON.stringify(value),path,game);return}
  if(typeof value==='string'){quoted(value,path,game);return}
  if(Array.isArray(value)){send('[',path,game);for(let i=0;i<value.length;i++){if(i)send(',',path,game);walk(value[i],diagnostic?`${path}[${i}]`:null,game)}send(']',path,game);return}
  send('{',path,game);const names=isTown?ordered(c.townKeys):Object.keys(value);
  for(let i=0;i<names.length;i++){
   const k=names[i],p=diagnostic?keyPath(path,k):null;if(i)send(',',path,game);quoted(k,p,game);send(':',path,game);
   if(isTown&&['events','attempts','arrivals'].includes(k))history(k,p,game);
   else {
    // Fixed-depth structural location, not object identity or a growing path string.
    const next=location==='input'&&k==='game'?'game':location==='game'&&k==='labConnection'?'lab':location==='lab'&&k==='town'?'town':null;
    walk(value[k],p,game||(location==='input'&&k==='game'),next);
   }
  }
  send('}',path,game);
 }
 walk(scope==='game'?c.active.game:c.active,scope==='game'?'$["game"]':'$',scope==='game',scope==='game'?'game':'input');
}
function diagnosticPath(candidate,scope,limit,offset){
 let position=0;const found={};
 try{walkContents(candidate,scope,limit,(text,path)=>{if(offset<position+text.length){found.path=path;throw found}position+=text.length},true)}catch(e){if(e!==found)throw e}
 return found.path??'$<EOF>';
}
function textHash(){
 const hash=createHash('sha256');let pending='',bytes=0,updates=0;
 return {update(text){let s=pending+text;pending='';const n=s.charCodeAt(s.length-1);if(n>=0xd800&&n<=0xdbff){pending=s.at(-1);s=s.slice(0,-1)}if(s){hash.update(s);updates++;bytes+=Buffer.byteLength(s)}},finish(){if(pending){hash.update(pending);updates++;bytes+=Buffer.byteLength(pending)}return {sha:hash.digest('hex'),bytes,updates}}};
}
function fileReader(file){
 const fd=fs.openSync(file,'r'),buffer=Buffer.alloc(READ_BYTES),decoder=new StringDecoder('utf8'),hash=createHash('sha256');let eof=false,reads=0;
 return {next(){while(!eof){const n=fs.readSync(fd,buffer,0,buffer.length,null);reads++;if(n){hash.update(buffer.subarray(0,n));const text=decoder.write(buffer.subarray(0,n));if(text.length)return text}else{eof=true;return decoder.end()}}return ''},digest(){return hash.digest('hex')},reads(){return reads},close(){fs.closeSync(fd)}};
}
export function compareCandidate(candidate,expected,{referenceFile,scope='input',chunkUnits=MAX_UNITS}={}){
 if(!['input','game'].includes(scope)||!Number.isSafeInteger(chunkUnits)||chunkUnits<1||chunkUnits>MAX_UNITS)fail('comparison options',{stage:'options'});
 const allStart=performance.now(),v=performance.now();
 try{validateCandidate(candidate,expected)}catch(error){error.stage=classify(error);throw error}
 const validationMs=performance.now()-v,heapAfterValidation=process.memoryUsage().heapUsed;
 const sourceStart=performance.now(),source=hashFile(referenceFile),expectedSha=scope==='input'?expected.inputSha:expected.gameSha;
 if(source.sha!==expectedSha)fail('independent reference SHA mismatch',{stage:'independent-reference'});
 const referenceHashMs=performance.now()-sourceStart,reader=fileReader(referenceFile),output=textHash(),gameHash=textHash();
 let ref='',position=0,offset=0,buffer='',bufferGame=false,maxChunkUnits=0,chunks=0,pieces=0,comparisons=0;
 const distribution={one:0,twoToEight:0,nineTo64:0,over64:0},compareStart=performance.now();
 function mismatch(message,at,details={}){fail(message,{stage:'content',offsetUnits:at,path:diagnosticPath(candidate,scope,chunkUnits,at),...details})}
 function flush(){
  if(!buffer.length)return;
  chunks++;maxChunkUnits=Math.max(maxChunkUnits,buffer.length);output.update(buffer);if(bufferGame)gameHash.update(buffer);
  let i=0;while(i<buffer.length){
   if(position===ref.length){ref=reader.next();position=0;if(!ref.length)mismatch('reference ended before candidate',offset)}
   const n=Math.min(ref.length-position,buffer.length-i),a=buffer.slice(i,i+n),b=ref.slice(position,position+n);comparisons++;
   if(a!==b){let j=0;while(a[j]===b[j])j++;mismatch('independent content mismatch',offset+j,{candidateUnit:a.charCodeAt(j),referenceUnit:b.charCodeAt(j)})}
   position+=n;i+=n;offset+=n;
  }
  buffer='';
 }
 function emit(text,path,game){
  pieces++;distribution[text.length===1?'one':text.length<=8?'twoToEight':text.length<=64?'nineTo64':'over64']++;
  if(buffer.length&&bufferGame!==game)flush();bufferGame=game;
  for(let i=0;i<text.length;){const n=Math.min(chunkUnits-buffer.length,text.length-i);buffer+=text.slice(i,i+n);i+=n;if(buffer.length===chunkUnits)flush()}
 }
 try{
  walkContents(candidate,scope,chunkUnits,emit);flush();
  if(position<ref.length||reader.next().length)fail('reference has trailing content',{stage:'content',offsetUnits:offset,path:'$<EOF>'});
  if(reader.digest()!==source.sha)fail('reference changed during comparison',{stage:'independent-reference'});
  const emitted=output.finish(),game=gameHash.finish();
  if(emitted.sha!==expectedSha||game.sha!==expected.gameSha)fail('independent output/game anchor mismatch',{stage:'independent-anchor'});
  return {equal:true,scope,includesSidecars:scope==='input',units:offset,bytes:emitted.bytes,outputSha:emitted.sha,gameSha:game.sha,pieces,pieceLengthDistribution:distribution,chunks,comparisons,outputHashUpdates:emitted.updates,gameHashUpdates:game.updates,maxChunkUnits,maxReferenceBytes:READ_BYTES,readCalls:reader.reads(),schemaCacheEntries:2,diagnosticSpanEntries:0,validationMs,referenceHashMs,comparisonMs:performance.now()-compareStart,totalMs:performance.now()-allStart,heapAfterValidation,heapAfterComparison:process.memoryUsage().heapUsed,provenance:false};
 }finally{reader.close()}
}
