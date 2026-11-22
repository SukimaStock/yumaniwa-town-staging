import test from 'node:test';
import assert from 'node:assert/strict';
import {currentGraph,sameIdentity} from './r0-cache-graph.mjs';
test('performance replay graph keeps single identities and no repeated perf query',()=>{
 const graph=currentGraph();
 for(const [parent,node] of graph.nodes)for(const edge of node.edges){
  const url=new URL(edge.spec,'https://test/'+parent);
  assert(url.searchParams.getAll('perf').length<=1,`duplicate perf in ${parent}: ${edge.spec}`);
 }
 for(const file of ['clone-data.mjs','economy.mjs','regional-deliveries.mjs','regional-partners.mjs','regional-consignment.mjs']){
  const target='works/ambertime/'+file,parents=[...graph.nodes].filter(([,n])=>n.edges.some(e=>e.target===target)).map(([p])=>p);
  assert(parents.length);sameIdentity(graph,parents,target);
 }
});
