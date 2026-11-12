import test from 'node:test';import assert from 'node:assert/strict';
import {encodeExactJSON as encode,decodeExactJSON as decode,LOSSLESS_LIMITS as L} from '../lossless-json.mjs';
const round=(v,kind='native')=>{const raw=JSON.stringify(v),packed=encode(raw,kind);assert.equal(decode(packed,kind),raw);return packed;};
const mutated=(text,f)=>{const v=JSON.parse(text);f(v);return JSON.stringify(v);};
test('exact scalar/key order/Unicode/prototype-like keys preserved without object side effects',()=>{
 for(const v of [null,true,7,-3.2,'短い文','\ud800','😀',[],{},JSON.parse('{"__proto__":{"x":1},"constructor":"yes","a":null}'),{z:[{b:'repeated long value',a:1},{b:'repeated long value',a:2}],first:'1'}])round(v);
 assert.equal({}.x,undefined);assert.throws(()=>encode('{"x":1,"x":2}','native'));assert.throws(()=>encode('-0','native'));assert.throws(()=>encode(' 1','native'));
});
test('deterministic generated JSON corpus preserves exact independent original bytes',()=>{
 let seed=123;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);for(let i=0;i<250;i++){const x=Array.from({length:Math.floor(r()*50)},(_,k)=>({id:k,value:r()<.4?'a repeated meaningful phrase':String(r()),n:Math.floor(r()*1000),nested:[r()<.5,null,'麦😀']}));round(x);}
});
test('malformed references, unused dictionaries, key duplicates, wrong kind and alternate spellings reject',()=>{
 const p=round([{name:'a repeated meaningful phrase'},{name:'a repeated meaningful phrase'}]);
 for(const f of [x=>x.strings.push('unused dictionary phrase'),x=>x.shapes.push(['unused']),x=>x.root=[-2,99999],x=>x.root=[-3],x=>x.root=[0,1,2,3],x=>x.shapes[0].push(x.shapes[0][0]),x=>x.strings.push(x.strings[0]),x=>x.root={x:1}])assert.throws(()=>decode(mutated(p,f),'native'));
 assert.throws(()=>decode(p,'session'));assert.throws(()=>decode(p+' ','native'));
});
test('decoded text bound cap-1/cap pass, cap+1 rejects before expansion beyond cap',()=>{
 const base=Array(256).fill('x'.repeat(65533));
 for(const delta of [-2,-1,0]){const v=base.slice();v[0]=v[0].slice(0,v[0].length+delta);const raw=JSON.stringify(v);assert.equal(raw.length,L.decoded+1+delta);if(delta===0)assert.throws(()=>encode(raw,'native'));else assert.equal(decode(encode(raw,'native'),'native'),raw);}
 const p=JSON.parse(round(['x'.repeat(65533),'x'.repeat(65533)]));p.root=[-1,...Array.from({length:257},()=>[-2,0])];assert.throws(()=>decode(JSON.stringify(p),'native'));
});
test('depth, shape count, object width, array length, quoted value and wire bounds fail closed',()=>{
 for(const n of [L.depth-1,L.depth,L.depth+1]){let v=0;for(let i=0;i<n;i++)v=[v];if(n<=L.depth)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
 for(const n of [L.shapes-1,L.shapes,L.shapes+1]){const v=Array.from({length:n},(_,i)=>({['k'+i]:i}));if(n<=L.shapes)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
 for(const n of [L.width-1,L.width,L.width+1]){const v=Object.fromEntries(Array.from({length:n},(_,i)=>['k'+i,0]));if(n<=L.width)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
 for(const n of [L.array-1,L.array,L.array+1]){const v=Array(n).fill(0);if(n<=L.array)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
 for(const n of [L.quotedString-3,L.quotedString-2,L.quotedString-1]){const raw=JSON.stringify('x'.repeat(n));if(raw.length<=L.quotedString)assert.equal(decode(encode(raw,'native'),'native'),raw);else assert.throws(()=>encode(raw,'native'));}
 for(const n of [L.wire-1,L.wire,L.wire+1])assert.throws(()=>decode(' '.repeat(n),'native'));
});
test('expanded node budget cap-1/cap pass and cap+1 rejects',()=>{
 for(const target of [L.nodes-1,L.nodes,L.nodes+1]){const scalar=target-9,v=Array.from({length:8},(_,i)=>Array(Math.floor(scalar/8)+(i<scalar%8?1:0)).fill(0));if(target<=L.nodes)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
});
test('canonical wire cap-1 passes, cap/cap+1 reject without changing the limit',()=>{
 for(const target of [L.wire-1,L.wire,L.wire+1]){
  const v=Array.from({length:100},(_,i)=>'x'.repeat(60000)+String(i));
  const text=()=>JSON.stringify({codec:'ambertime-exact-json/1',kind:'native',shapes:[],strings:[],root:[-1,...v]});let remaining=target-text().length;
  for(let i=0;remaining>0;i++){const add=Math.min(remaining,L.quotedString-JSON.stringify(v[i]).length);v[i]+='y'.repeat(add);remaining-=add;}
  const p=text();assert.equal(p.length,target);if(target<L.wire){assert.equal(encode(JSON.stringify(v),'native'),p);assert.equal(decode(p,'native'),JSON.stringify(v));}else{assert.throws(()=>encode(JSON.stringify(v),'native'));assert.throws(()=>decode(p,'native'));}
 }
});
test('unique value-string budget cap-1/cap pass, cap+1 rejects',()=>{
 for(const n of [L.strings-1,L.strings,L.strings+1]){const strings=Array.from({length:n},(_,i)=>'long-string-value-'+i),v=[strings,strings];if(n<=L.strings)round(v);else assert.throws(()=>encode(JSON.stringify(v),'native'));}
});
