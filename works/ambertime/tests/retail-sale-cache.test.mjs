import test from 'node:test';
import {currentGraph,requireEdge} from './r0-cache-graph.mjs';
test('entry versions reachable retail display dependencies without replacing distillation graph',()=>{
 const graph=currentGraph(),base='works/ambertime/';
 for(const [parent,target] of [['index.html','shop-app.mjs'],['index.html','market.css'],['shop-app.mjs','market-ui.mjs'],['market-ui.mjs','retail-sale-motion.mjs'],['shop-app.mjs','canvas-scene.mjs']])requireEdge(graph,base+parent,base+target);
});
