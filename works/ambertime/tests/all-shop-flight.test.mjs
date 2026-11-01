import test from 'node:test';import assert from 'node:assert/strict';
import {ordinarySaleGroups} from '../retail-sale-motion.mjs';
test('same product at three stores keeps three separate destinations',()=>{
 const sales=['retail','town-liquor','supermarket'].map(shopId=>({shopId,productId:7,units:1})),before=JSON.stringify(sales),groups=ordinarySaleGroups(sales);
 assert.deepEqual(groups.map(g=>g.shopId),sales.map(g=>g.shopId));assert.deepEqual(groups.map(g=>g.productId),[7,7,7]);assert.deepEqual(groups.map(g=>g.units),[1,1,1]);assert.equal(JSON.stringify(sales),before);
});
test('shared large-sale budget preserves each store/release quantity and ends within600ms',()=>{
 const sales=[{shopId:'retail',productId:7,units:12},{shopId:'town-liquor',productId:7,units:9},{shopId:'supermarket',productId:8,units:5}],groups=ordinarySaleGroups(sales);
 assert.equal(groups.length,12);for(const sale of sales)assert.equal(groups.filter(g=>g.shopId===sale.shopId&&g.productId===sale.productId).reduce((n,g)=>n+g.units,0),sale.units);
 assert.equal(Math.max(...groups.map(g=>g.delay+g.duration)),600);assert.deepEqual(ordinarySaleGroups(sales),groups);
});

test('two bottles at every store remain six bottles rather than four cross-store groups',()=>{
 const sales=['retail','town-liquor','supermarket'].map(shopId=>({shopId,productId:7,units:2})),groups=ordinarySaleGroups(sales);
 assert.equal(groups.length,6);for(const sale of sales){const own=groups.filter(g=>g.shopId===sale.shopId);assert.equal(own.length,2);assert(own.every(g=>g.units===1));}
 assert.equal(Math.max(...groups.map(g=>g.delay+g.duration)),600);
});
