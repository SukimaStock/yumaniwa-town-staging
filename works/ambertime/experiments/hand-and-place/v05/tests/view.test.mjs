import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from '../../v04/model.mjs';
import {bottles,changesFrom,MODES} from '../view.mjs';
test('bottle object cap and exact overflow, including empty and large stocks',()=>{
 for(const [n,visible,extra] of [[0,0,0],[1,1,0],[2,2,0],[3,3,0],[6,3,3],[100,3,97]])assert.deepEqual(bottles(n),{visible,extra});
});
test('delivery targets hand and shop; time targets shop without consuming hand',()=>{
 const s=M.create(),run=a=>{const start=s.events.length;M.dispatch(s,a);return changesFrom(s.events.slice(start));};
 run({type:'select-order',orderId:1});assert.deepEqual(run({type:'select-card',lotId:1}),{shops:{},hand:{},motions:[]});
 const sent=run({type:'deliver'});assert.equal(sent.hand[1].origin,'hand');assert.equal(sent.shops.restaurant.origin,'hand');assert.equal(sent.motions[0].count,2);
 const t=run({type:'step'});assert.equal(t.shops.restaurant.text,'時間：2→1本');assert.deepEqual(t.hand,{});assert.deepEqual(Object.keys(t.shops),['restaurant']);assert.equal(s.lots[0].stock,4);
 const next=run({type:'step'});assert.equal(next.shops.restaurant.text,'時間：1→0本 · 注文到着');assert.deepEqual(next.motions.map(m=>m.kind),['use','order']);
 assert.deepEqual(changesFrom([]),{shops:{},hand:{},motions:[]});
});
test('two shops use different periods and quiet shop has no motion',()=>{
 const s=M.create();for(const [orderId,lotId] of [[1,2],[2,3]])for(const a of [{type:'select-order',orderId},{type:'select-card',lotId},{type:'deliver'}])M.dispatch(s,a);
 let i=s.events.length;M.dispatch(s,{type:'step'});assert.deepEqual(Object.keys(changesFrom(s.events.slice(i)).shops),['liquor']);assert.equal(s.shops.restaurant.stock,2);
 i=s.events.length;M.dispatch(s,{type:'step'});assert.deepEqual(Object.keys(changesFrom(s.events.slice(i)).shops),['restaurant','liquor']);
});
test('scarce delivery uses actual one bottle; zero card recipe remains',()=>{
 const s=M.create({scenario:'scarce'});M.dispatch(s,{type:'select-order',orderId:1});M.dispatch(s,{type:'select-card',lotId:1});const i=s.events.length;M.dispatch(s,{type:'deliver'});const c=changesFrom(s.events.slice(i));assert.equal(c.motions[0].count,1);assert.equal(s.lots[0].stock,0);assert.equal(s.shops.restaurant.stock,1);assert.ok(M.recipeText(s.lots[0]));
});
test('view transforms do not mutate state or exported v04 log, including replay',()=>{
 const actions=[{type:'select-order',orderId:1},{type:'select-card',lotId:1},{type:'deliver'},{type:'step'},{type:'step'},{type:'select-order',orderId:2},{type:'select-card',lotId:3},{type:'deliver'},{type:'step'},{type:'step'}];let baseline;
 for(const mode of MODES){const s=M.create();for(const a of actions){const i=s.events.length;M.dispatch(s,a);const before=JSON.stringify(s);changesFrom(s.events.slice(i));s.lots.forEach(l=>bottles(l.stock));assert.equal(JSON.stringify(s),before,mode);}const log=M.exportLog(s);if(baseline)assert.deepEqual(log,baseline);else baseline=log;assert.deepEqual(M.replay(log),s);assert.deepEqual(M.validate(s),{ok:true,errors:[]});}
});
test('existing v04 fixedseed standard/scarce/slow logs remain directly replayable',()=>{
 for(const name of ['standard','scarce','slow-order']){const log=JSON.parse(readFileSync(new URL(`../../v04/tests/seed42-${name}.json`,import.meta.url)));assert.deepEqual(M.exportLog(M.replay(log)),log);}
});
test('initial/import baseline is silent; pending orders persist without new events',()=>{
 const s=M.create();const log=M.exportLog(s),r=M.replay(log);assert.deepEqual(changesFrom(r.events.slice(r.events.length)).motions,[]);
 const start=s.events.length;M.dispatch(s,{type:'step'});assert.deepEqual(changesFrom(s.events.slice(start)).motions,[]);assert.equal(s.orders[0].status,'open');
});
test('bottling is explicit and no maturation completion meter is used',()=>{
 const s=M.create();M.dispatch(s,{type:'step'});M.dispatch(s,{type:'step'});assert.equal(s.lots.length,3);const i=s.events.length;M.dispatch(s,{type:'bottle',jobId:1});assert.equal(changesFrom(s.events.slice(i)).hand[4].text,'瓶詰め +6本');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');assert.ok(app.includes("import * as M from '../v04/model.mjs'"));assert.ok(!app.includes('<progress'));assert.ok(!app.includes('requestAnimationFrame'));assert.ok(!app.includes('setInterval'));
});
