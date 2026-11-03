import test from 'node:test';
import {currentGraph,requireEdge,sameIdentity,assertUpdatedGraph,baselineGraph} from './r0-cache-graph.mjs';
test('cut entry and changed drawing dependencies use versioned reachable module identities',()=>{
 const graph=currentGraph(),base='works/ambertime/';
 for(const [parent,target] of [['index.html','shop-app.mjs'],['shop-app.mjs','canvas-scene.mjs'],['shop-app.mjs','distill-tools-view.mjs'],['shop-app.mjs','distill-learning.mjs'],['canvas-scene.mjs','cut-bar.mjs'],['canvas-scene.mjs','distill-tools-view.mjs'],['shop-app.mjs','flavor-color.mjs']])requireEdge(graph,base+parent,base+target);
 sameIdentity(graph,[base+'shop-app.mjs',base+'canvas-scene.mjs'],base+'distill-tools-view.mjs');
 assertUpdatedGraph(baselineGraph(),graph);
});
