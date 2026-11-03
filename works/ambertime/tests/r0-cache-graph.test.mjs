import test from 'node:test';
import assert from 'node:assert/strict';
import {dependencies,buildGraph,currentGraph,requireEdge,sameIdentity,assertUpdatedGraph,baselineGraph} from './r0-cache-graph.mjs';
const path='works/ambertime/';
const fixture=(patch={})=>({
 'index.html':'<link rel="stylesheet" href="./style.css?v=1&amp;view=1"><script type="module" src="./app.mjs?v=1"></script>',
 'style.css':'@import "./child.css?v=1"; /* @import "./missing.css"; */',
 'child.css':'body{font-size:20px}',
 'app.mjs':`import {x} from './view.mjs?v=1'; export {y} from './export.mjs?v=1'; import('./dynamic.mjs?v=1'); new Worker(new URL('./worker.mjs?v=1',import.meta.url),{type:'module'});`,
 'view.mjs':'export const x=1;', 'export.mjs':'export const y=1;', 'dynamic.mjs':'export const dynamic=1;',
 'worker.mjs':"import './view.mjs?v=1';",...patch
});
const graph=files=>buildGraph(file=>files[file],'index.html');

test('dependency model covers HTML entities, CSS, imports, re-exports, dynamic imports and workers',()=>{
 const g=graph(fixture());assert.equal(g.nodes.size,8);
 for(const [target,kind] of [['view.mjs','import'],['export.mjs','export'],['dynamic.mjs','dynamic-import'],['worker.mjs','worker']])requireEdge(g,'app.mjs',target,{kind});
 assert.equal(requireEdge(g,'index.html','style.css')[0].spec,'./style.css?v=1&view=1');
 requireEdge(g,'style.css','child.css',{kind:'style-import'});sameIdentity(g,['app.mjs','worker.mjs'],'view.mjs');
});
test('multiline and compact declarations are read without treating comments as edges',()=>{
 const source=`const text="import('./fake.mjs?v=1')"; const pattern=/import\\('fake'\\)/;\n// import './missing.mjs';\n/* export * from './missing2.mjs'; */\nimport {x,\n y} from './ok.mjs?v=1';\nexport {x as z}\n from './out.mjs?v=1';\nimport'./side.mjs?v=1';`;
 assert.deepEqual(dependencies(source,'app.mjs').map(e=>e.target),['ok.mjs','out.mjs','side.mjs']);
});
test('missing graph resources, required edges, unversioned dependencies and split identities fail',()=>{
 assert.throws(()=>graph(fixture({'view.mjs':undefined})),/missing cache dependency/);
 const g=graph(fixture());assert.throws(()=>requireEdge(g,'app.mjs','absent.mjs'),/missing/);
 const noVersion=graph(fixture({'app.mjs':"import './view.mjs';"}));assert.throws(()=>requireEdge(noVersion,'app.mjs','view.mjs'),/unversioned/);
 const split=graph(fixture({'worker.mjs':"import './view.mjs?v=2';"}));assert.throws(()=>sameIdentity(split,['app.mjs','worker.mjs'],'view.mjs'),/split module identity/);
});
test('computed imports and worker URLs fail explicitly for graph review',()=>{
 assert.throws(()=>dependencies('import(path);','app.mjs'),/nonliteral dynamic import/);
 assert.throws(()=>dependencies('new Worker(path);','app.mjs'),/nonliteral worker URL/);
 assert.throws(()=>dependencies("const t=`${import('./hidden.mjs?v=1')}`;",'app.mjs'),/template loader expression/);
 assert.deepEqual(dependencies("object.import('./not-a-module.mjs');",'app.mjs'),[]);
});
test('changed child requires all importer identities and propagation to the HTML entry',()=>{
 const before=graph(fixture());
 assert.throws(()=>assertUpdatedGraph(before,graph(fixture({'view.mjs':'export const x=2;'}))),/stale cache identity/);
 const partial=fixture({'view.mjs':'export const x=2;','app.mjs':fixture()['app.mjs'].replace('./view.mjs?v=1','./view.mjs?v=2')});
 assert.throws(()=>assertUpdatedGraph(before,graph(partial)),/stale cache identity/);
 const updated=fixture({'view.mjs':'export const x=2;','app.mjs':partial['app.mjs'].replace('./worker.mjs?v=1','./worker.mjs?v=2'),'worker.mjs':"import './view.mjs?v=2';",'index.html':fixture()['index.html'].replace('./app.mjs?v=1','./app.mjs?v=2')});
 assert.doesNotThrow(()=>assertUpdatedGraph(before,graph(updated)));
});
test('changed stylesheet requires its parent import and HTML stylesheet identity update',()=>{
 const before=graph(fixture());assert.throws(()=>assertUpdatedGraph(before,graph(fixture({'child.css':'body{font-size:24px}'}))),/stale cache identity/);
 const updated=fixture({'child.css':'body{font-size:24px}','style.css':'@import "./child.css?v=2";','index.html':fixture()['index.html'].replace('./style.css?v=1','./style.css?v=2')});
 assert.doesNotThrow(()=>assertUpdatedGraph(before,graph(updated)));
});
test('worker, re-export and dynamic dependency changes cannot reuse old identities',()=>{
 const before=graph(fixture());for(const target of ['worker.mjs','export.mjs','dynamic.mjs'])assert.throws(()=>assertUpdatedGraph(before,graph(fixture({[target]:fixture()[target]+'\n// changed bytes'}))),/stale cache identity/);
});
test('pre-R0 anchor is nonempty and current graph preserves the entry, styles and both worker branches',()=>{
 const before=baselineGraph(),after=currentGraph();assert.equal(before.nodes.size,106);assert.equal(before.entry,path+'index.html');
 for(const css of ['shop.css','room-scene.css','font-uniform.css','market.css'])requireEdge(after,path+'index.html',path+css,{kind:'stylesheet'});
 for(const worker of ['history-worker.mjs','cask-ledger-worker.mjs'])requireEdge(after,path+'shop-app.mjs',path+worker,{kind:'worker'});
 assertUpdatedGraph(before,after);
});
