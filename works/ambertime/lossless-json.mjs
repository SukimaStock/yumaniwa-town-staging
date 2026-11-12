// Exact JSON transport only: no game field is removed or semantically rewritten.
export const LOSSLESS_LIMITS=Object.freeze({wire:6016384,decoded:16777216,nodes:1000000,depth:32,shapes:4096,strings:65536,width:16384,array:131072,quotedString:65536});
export const LOSSLESS_CODEC='ambertime-exact-json/1';
const fail=()=>{throw Error('保存の圧縮形式または資源上限を確認できません。元の記録を残して停止しています。');};
const check=x=>{if(!x)fail();};
const quote=s=>{check(typeof s==='string');const q=JSON.stringify(s);check(q.length<=LOSSLESS_LIMITS.quotedString);return q;};
const kindOK=k=>k==='native'||k==='session';
const keys=['codec','kind','shapes','strings','root'];
export function isLosslessEnvelope(value,kind){return value?.codec===LOSSLESS_CODEC&&value?.kind===kind;}
export function encodeExactJSON(raw,kind){
 check(kindOK(kind)&&typeof raw==='string'&&raw.length<=LOSSLESS_LIMITS.decoded);
 let original;try{original=JSON.parse(raw);}catch{fail();}check(JSON.stringify(original)===raw);
 const counts=new Map();let nodes=0;
 function inspect(v,depth){
  check(depth<=LOSSLESS_LIMITS.depth&&++nodes<=LOSSLESS_LIMITS.nodes);
  if(typeof v==='string'){quote(v);counts.set(v,(counts.get(v)??0)+1);check(counts.size<=LOSSLESS_LIMITS.strings);return;}
  if(v===null||typeof v==='boolean'||typeof v==='number')return;
  if(Array.isArray(v)){check(v.length<=LOSSLESS_LIMITS.array);for(const item of v)inspect(item,depth+1);return;}
  const names=Object.keys(v);check(names.length<=LOSSLESS_LIMITS.width);for(const name of names){quote(name);inspect(v[name],depth+1);}
 }
 inspect(original,0);
 const shapes=[],shapeIds=new Map(),strings=[],stringIds=new Map();
 function pack(v){
  if(typeof v==='string'){
   if(counts.get(v)<2||quote(v).length<12)return v;
   if(!stringIds.has(v)){check(strings.length<LOSSLESS_LIMITS.strings);stringIds.set(v,strings.length);strings.push(v);}return [-2,stringIds.get(v)];
  }
  if(v===null||typeof v==='boolean'||typeof v==='number')return v;
  if(Array.isArray(v))return [-1,...v.map(pack)];
  const names=Object.keys(v),signature=JSON.stringify(names);
  if(!shapeIds.has(signature)){check(shapes.length<LOSSLESS_LIMITS.shapes);shapeIds.set(signature,shapes.length);shapes.push(names);}
  return [shapeIds.get(signature),...names.map(k=>pack(v[k]))];
 }
 const root=pack(original),text=JSON.stringify({codec:LOSSLESS_CODEC,kind,shapes,strings,root});check(text.length<LOSSLESS_LIMITS.wire);return text;
}
export function decodeExactJSON(text,kind){
 check(kindOK(kind)&&typeof text==='string'&&text.length<LOSSLESS_LIMITS.wire);
 let data;try{data=JSON.parse(text);}catch{fail();}
 check(data&&typeof data==='object'&&!Array.isArray(data)&&JSON.stringify(Object.keys(data))===JSON.stringify(keys)&&JSON.stringify(data)===text&&isLosslessEnvelope(data,kind));
 check(Array.isArray(data.shapes)&&data.shapes.length<=LOSSLESS_LIMITS.shapes&&Array.isArray(data.strings)&&data.strings.length<=LOSSLESS_LIMITS.strings);
 const shapeSet=new Set(),stringSet=new Set();
 const shapes=data.shapes.map(shape=>{check(Array.isArray(shape)&&shape.length<=LOSSLESS_LIMITS.width);const seen=new Set(),quoted=shape.map(key=>{check(typeof key==='string'&&!seen.has(key));seen.add(key);return quote(key);});const sig=JSON.stringify(shape);check(!shapeSet.has(sig));shapeSet.add(sig);return quoted;});
 const strings=data.strings.map(s=>{check(typeof s==='string'&&!stringSet.has(s));stringSet.add(s);const q=quote(s);check(q.length>=12);return q;});
 const chunks=[];let units=0,nodes=0;
 const emit=s=>{check(units+s.length<=LOSSLESS_LIMITS.decoded);units+=s.length;chunks.push(s);};
 function unpack(v,depth){
  check(depth<=LOSSLESS_LIMITS.depth&&++nodes<=LOSSLESS_LIMITS.nodes);
  if(v===null||typeof v==='boolean'||typeof v==='number'){emit(JSON.stringify(v));return;}
  if(typeof v==='string'){emit(quote(v));return;}
  check(Array.isArray(v)&&v.length>=1&&Number.isInteger(v[0]));const tag=v[0];
  if(tag===-2){check(v.length===2&&Number.isInteger(v[1])&&v[1]>=0&&v[1]<strings.length);emit(strings[v[1]]);return;}
  if(tag===-1){check(v.length-1<=LOSSLESS_LIMITS.array);emit('[');for(let i=1;i<v.length;i++){if(i>1)emit(',');unpack(v[i],depth+1);}emit(']');return;}
  check(tag>=0&&tag<shapes.length);const shape=shapes[tag];check(v.length===shape.length+1);emit('{');for(let i=0;i<shape.length;i++){if(i)emit(',');emit(shape[i]);emit(':');unpack(v[i+1],depth+1);}emit('}');
 }
 unpack(data.root,0);const raw=chunks.join('');
 // Canonical encoding forbids hidden/unused dictionaries and alternate aliases.
 check(encodeExactJSON(raw,kind)===text);return raw;
}
