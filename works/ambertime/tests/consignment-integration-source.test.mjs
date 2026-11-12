// Fresh main-to-recovered-candidate comparison; archived predecessor tests retained separately.
import {createHash} from 'node:crypto';
import {invertReviewedCopyV07} from './copy-v07-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';import{readFileSync}from'node:fs';import{buildGraph,dependencies,assertUpdatedGraph,sameIdentity}from'./r0-cache-graph.mjs';
const base='0778bcf4555737ec45947a80aca8f761f39fa429',source='a210984399547b07728c48bcd83365cf2f28e269';
const git=(sha,p)=>execFileSync('git',['show',sha+':'+p],{maxBuffer:32*1024*1024}).toString();
// SHA-256 of exact a210 source after dependency-query stripping only.
const sourceHashes={"partner-orders.mjs":"b81e2b629e433bf0f949bc44d64d910aaa85e9b1a7b1c7ed703a678b87a323a8","placement-mode.mjs":"bf8904d5d3ebac32c786164ebf98599312044b9ec565065cf146a62772055a5b","regional-consignment.mjs":"5902b173ee5b558f9cd1b9b7602707a4d56d686b4c0592bca9aa3589922eaa14","regional-deliveries.mjs":"72a188237ad0786a791c71fbc2a59f4e57c101dafc372301b581da23583eea52","store-market.mjs":"d136720a28b125ce2844786253014faf766f99e884253f70d40314fd4d3f25c6","ledger-view.mjs":"5bb8979758c77a5f3ed5530ec364ef2c97e320557516bf3e98b3df24f7f2c5a4"};
const read=p=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
const normHtml=(p,s)=>p.endsWith('.html')?s.replace(/(\b(?:src|href)=["'])(?![./#]|[a-z]+:)([^"']+)/g,'$1./$2'):s;
const entries=['works/ambertime/index.html','works/ambertime-small-memory-lab/index.html','works/ambertime-small-memory-lab/frame.html','works/ambertime-strategy-lab/index.html','works/ambertime-strategy-lab/internal/index.html','works/ambertime-strategy-lab/internal/stage5/index.html'];
function stripURLs(p,s){const known=new Set(dependencies(normHtml(p,s),p).map(e=>e.spec));return s.replace(/(["'])([^"'\n]*?)\1/g,(all,q,value)=>{let key=value.replaceAll('&amp;','&');if(p.endsWith('.html')&&!/^(?:[./#]|[a-z]+:)/.test(key))key='./'+key;return known.has(key)?q+value.split('?')[0]+q:all;});}
test('six entry graphs preserve recursive identities and exact shared native module',()=>{
 for(const entry of entries){const before=buildGraph(p=>normHtml(p,git(base,p)),entry),after=buildGraph(p=>normHtml(p,read(p)),entry);assertUpdatedGraph(before,after);
  for(const target of ['works/ambertime/partner-orders.mjs','works/ambertime/regional-consignment.mjs','works/ambertime/placement-mode.mjs']){
   const parents=[...after.nodes].filter(([,n])=>n.edges.some(e=>e.target===target)).map(([p])=>p);if(parents.length)sameIdentity(after,parents,target);
  }
 }
});
test('all changed Lab files are exactly declared import or entry URL metadata, not content',()=>{
 const allowed=['ambertime-small-memory-lab/app.mjs','ambertime-small-memory-lab/fixture.mjs','ambertime-small-memory-lab/frame.html','ambertime-small-memory-lab/frame.mjs','ambertime-small-memory-lab/index.html','ambertime-small-memory-lab/memory.mjs','ambertime-strategy-lab/model.mjs','ambertime-strategy-lab/app.mjs','ambertime-strategy-lab/index.html','ambertime-strategy-lab/internal/adapters.mjs','ambertime-strategy-lab/internal/app.mjs','ambertime-strategy-lab/internal/index.html'].map(p=>'works/'+p).sort();
 const changed=execFileSync('git',['diff','--name-only',base,'--','works/ambertime-small-memory-lab','works/ambertime-strategy-lab'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
 assert.deepEqual(changed,allowed,'every changed external Lab path must have URL-only proof');
 for(const p of allowed)assert.equal(stripURLs(p,read(p)),stripURLs(p,git(base,p)),p);
});
test('economic and replay source matches exact927 after exact reviewed codec and private replay inverses',()=>{
 for(const name of ['partner-orders.mjs','placement-mode.mjs','regional-consignment.mjs','regional-deliveries.mjs','store-market.mjs','ledger-view.mjs']){
  const p='works/ambertime/'+name;let actual=read(p);
  if(name==='partner-orders.mjs'){
   // v1.0 enumerates A once and salary B twice; fixed927 hash remains unchanged.
   actual=invertReviewedCopyV07(actual);
   const line=actual.split('\n').find(l=>l.startsWith('import {decodeExactJSON,isLosslessEnvelope}'));assert(line);actual=actual.replace(line+'\n','');
   const branch="if(isLosslessEnvelope(s,'native'))s=JSON.parse(decodeExactJSON(text,'native'));";assert.equal(actual.split(branch).length,2);actual=actual.replace(branch,'');
   // Invert only the three reviewed replay changes, each required exactly once.
   // Keep the original #927 expected hash; unrelated economic edits still fail.
   const helper=actual.split('\n').filter(l=>l.startsWith('import {cloneReplayState,withPrivateReplay}'));
   assert.equal(helper.length,1);actual=actual.replace(helper[0]+'\n','');
   for(const [now,prior] of [
    ['const clone=cloneReplayState,round=x=>Math.round(x*100)/100;','const clone=x=>structuredClone(x),round=x=>Math.round(x*100)/100;'],
    ['for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=withPrivateReplay(()=>apply(j,s.operations[i],context,i));','for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=apply(j,s.operations[i],context,i);'],
   ]){assert.equal(actual.split(now).length,2);actual=actual.replace(now,prior);}

  }
  assert.equal(createHash('sha256').update(stripURLs(p,actual)).digest('hex'),sourceHashes[name],name);
 }
});
