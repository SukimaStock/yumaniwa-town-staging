import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {currentGraph,requireEdge,sameIdentity,assertUpdatedGraph} from './r0-cache-graph.mjs';
import {R5_BASE_SHA,R5_GRAPH_SHA256,R5_ANCHOR,r5Graph} from './r6-cache-baseline.mjs';
const root='works/ambertime/',origin='https://ambertime.invalid/';
const newViews=['spirit-readout-view.mjs','distill-room-controller.mjs','warehouse-room-controller.mjs','ledger-history-view.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');

test('R5 immutable closure protects the four post-R0 modules and both worker branches',()=>{
 assert.equal(R5_BASE_SHA,'2ff8aba1287f1e7aba7ceb902cfaef5df1c9dd79');
 assert.equal(hash(JSON.stringify(R5_ANCHOR)),R5_GRAPH_SHA256);
 const before=r5Graph(),after=currentGraph();assert.equal(before.nodes.size,110);
 for(const name of newViews)requireEdge(before,root+'shop-app.mjs',root+name);
 for(const name of ['history-worker.mjs','cask-ledger-worker.mjs'])requireEdge(after,root+'shop-app.mjs',root+name,{kind:'worker'});
 requireEdge(after,root+'room-scene.css',root+'fonts/misaki_gothic_2nd.ttf',{kind:'asset',versioned:false});
 sameIdentity(after,[root+'shop-app.mjs',root+'canvas-scene.mjs'],root+'distill-tools-view.mjs');
 assertUpdatedGraph(before,after);
});

// Mutate graph bodies/URL identities, not production files. This tests the real
// R5 topology (including every importer) using the existing R0 cache contract.
function changedGraph(target){const graph=r5Graph();graph.nodes.get(target).hash=hash('R6 negative body: '+target);return graph;}
function propagate(graph,target){
 const pending=[target],seen=new Set();
 while(pending.length){const child=pending.shift();if(seen.has(child))continue;seen.add(child);
  for(const [parent,node] of graph.nodes){let changed=false;
   for(const edge of node.edges)if(edge.target===child){const url=new URL(edge.spec,origin+parent);url.searchParams.set('r6-proof','1');edge.spec=url.href;changed=true;}
   if(changed){node.hash=hash('R6 propagated body: '+parent);pending.push(parent);}
  }
 }
 return graph;
}
test('each R1/R3/R4/R5 module body change rejects an unchanged cached parent',()=>{
 for(const name of newViews){const target=root+name;assert.throws(()=>assertUpdatedGraph(r5Graph(),changedGraph(target)),/stale cache identity/);}
});
test('changing the new child URL without updating the HTML app URL still fails',()=>{
 for(const name of newViews){const target=root+name,after=changedGraph(target),app=after.nodes.get(root+'shop-app.mjs');
  app.edges.find(edge=>edge.target===target).spec+='&r6-proof=1';app.hash=hash('changed app '+name);
  assert.throws(()=>assertUpdatedGraph(r5Graph(),after),/stale cache identity: works\/ambertime\/index.html/);
 }
});
test('all incoming identities must propagate for Canvas, new views, workers, CSS and font',()=>{
 const targets=[...newViews,'canvas-scene.mjs','distill-tools-view.mjs','history-worker.mjs','cask-ledger-worker.mjs','room-scene.css','fonts/misaki_gothic_2nd.ttf'];
 for(const name of targets){const target=root+name,after=changedGraph(target);
  assert.throws(()=>assertUpdatedGraph(r5Graph(),after),/stale cache identity/);
  assert.doesNotThrow(()=>assertUpdatedGraph(r5Graph(),propagate(after,target)));
 }
});
test('actual font retry function resolves the same CSS font and changes only retry query',()=>{
 const source=readFileSync(new URL('../font-loader.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function renewSource(){'),end=source.indexOf('\nfunction retry(){',start);
 assert(start>=0&&end>start,'font retry function needs explicit review if moved');
 const body=source.slice(start,end).replaceAll('import.meta.url','moduleURL');
 const edges=currentGraph().nodes.get(root+'room-scene.css').edges.filter(edge=>edge.kind==='asset');
 const font=edges.find(edge=>edge.target===root+'fonts/misaki_gothic_2nd.ttf');assert(font);
 for(const attempts of [2,3]){
  const writes=[],style={fontFamily:'"AmberMisaki"',setProperty:(key,value)=>writes.push({key,value})};
  const context={URL,attempts,moduleURL:origin+root+'font-loader.mjs?v=0.35-font-1',CSSRule:{FONT_FACE_RULE:5},
   document:{styleSheets:[{get cssRules(){throw new Error('cross origin stylesheet');}},{cssRules:[{type:5,style:{fontFamily:'other'}},{type:5,style}]}]}};
  assert.equal(vm.runInNewContext(body+'\nrenewSource();',context),true);assert.equal(writes.length,1);assert.equal(writes[0].key,'src');
  const match=writes[0].value.match(/^url\("([^"]+)"\) format\("truetype"\)$/);assert(match);
  const actual=new URL(match[1]),expected=new URL(font.spec,origin+root+'room-scene.css');
  assert.equal(actual.pathname,expected.pathname);assert.deepEqual([...actual.searchParams],[['amber-font-retry',String(attempts)]]);
  actual.search='';assert.equal(actual.href,expected.href);
 }
 assert.equal(vm.runInNewContext(body+'\nrenewSource();',{URL,attempts:2,moduleURL:origin+root+'font-loader.mjs',CSSRule:{FONT_FACE_RULE:5},document:{styleSheets:[]}}),false);
});
