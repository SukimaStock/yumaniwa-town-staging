import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
import * as E from '../v011/model.mjs';
import {planSales} from '../../../market-sales.mjs';
const act=(s,type,data={})=>M.transact(s,{type,...data});
const stage=(s,shopId='bar',portion='all')=>act(s,'place',{shopId,portion});
const sell=(seed=42,shopId='bar')=>act(act(stage(M.create({seed}),shopId),'confirm'),'advance',{months:3});
test('five physical bottles survive staging, undo, cancel, commit and recall with no money or evaluation',()=>{
 let s=M.create();assert.equal(s.products[0].years,8);s=stage(s,'diner','1');s=stage(s,'specialist','1');assert.equal(M.freeHand(s),3);assert.equal(s.products[0].hand,5);assert.equal(M.productSummary(s).sold,0);
 s=act(s,'undo');assert.deepEqual(M.allocation(s),{diner:1,bar:0,specialist:0});s=act(s,'cancel');assert.equal(M.freeHand(s),5);
 s=act(stage(s,'specialist','all'),'confirm');assert.equal(s.revenue,0);assert.equal(s.products[0].shops.specialist,5);assert.equal(M.productSummary(s).sold,0);
 s=act(s,'recall',{productId:1,shopId:'specialist',count:2});assert.equal(s.products[0].hand,2);assert.equal(s.products[0].recovered,2);assert.equal(s.products[0].shops.specialist,3);
 s=act(stage(s,'bar','all'),'confirm');assert.equal(s.products[0].shops.bar,2);M.validate(s);
});
test('invalid and failed-persistence actions never mutate input',()=>{
 const s=M.create(),before=M.serialize(s);assert.throws(()=>act(s,'recall',{productId:1,shopId:'bar'}));assert.throws(()=>act(s,'confirm'));assert.throws(()=>M.transact(s,{type:'place',shopId:'bar',portion:'1'},()=>false));assert.throws(()=>act(s,'next',{sample:'deep',years:20,tier:'standard'}));assert.equal(M.serialize(s),before);
 const pending=stage(s);assert.throws(()=>act(pending,'advance',{months:1}));assert.throws(()=>act(pending,'next',{sample:'sweet',years:3,tier:'standard'}));
});
test('empty and uncommitted shelves generate no actual purchases or evaluations',()=>{
 const s=act(M.create(),'advance',{months:12});assert.equal(s.products[0].sold,0);assert.equal(s.revenue,0);assert.ok(s.lastMonths.every(m=>m.shops.length===0));assert.ok(M.productSummary(s).byShop.every(x=>x.representative===null&&x.evaluations.length===0));
});
test('sale proposals match native seeded planner exactly and one purchase creates one v011 evaluation',()=>{
 let s=act(stage(M.create({seed:7}),'bar'),'confirm');const p=s.products[0],expected=planSales([M.salesItem(p,5)],'retail',undefined,{month:1,seed:7,method:'seeded'});s=act(s,'advance',{months:1});assert.equal(s.products[0].sold,expected.sold);
 for(const m of s.lastMonths)for(const row of m.shops){assert.equal(row.count,row.evaluations.length);assert.equal(row.revenue,Math.round(row.count*row.unitPrice*100)/100);for(const e of row.evaluations){const guest=M.guests(row.shopId,s.seed).find(g=>g.id===e.id),expected=E.assess(p,guest,'B');assert.equal(e.score,expected.score);assert.deepEqual(e.reaction,E.reaction(expected,p));assert.equal(e.positiveImpression>0,['like','strong'].includes(e.verdict));assert.equal(e.negativeImpression>0,e.verdict==='miss');}}
});
test('three-month advance equals three one-month advances apart from action grouping',()=>{
 const a=act(stage(M.create(),'bar'),'confirm');let singles=a;for(let i=0;i<3;i++)singles=act(singles,'advance',{months:1});const batch=act(a,'advance',{months:3});const omit=s=>{const x=structuredClone(s);delete x.actions;return x;};assert.deepEqual(omit(singles),omit(batch));
});
test('strict JSON replay retains former bottles, remaining shelves, cash, reviews and next recipe',()=>{
 let s=sell(42,'specialist');const old=structuredClone(s.products[0]);s=act(s,'next',{sample:'smoke',years:20,tier:'high'});assert.deepEqual(s.products[0],old);assert.equal(s.products[1].hand,5);s=act(stage(s,'bar','5'),'confirm');s=act(s,'advance',{months:3});assert.equal(M.serialize(M.restore(M.serialize(s))),M.serialize(s));const broken=JSON.parse(M.serialize(s));broken.products[0].profile.smoke=.99;assert.throws(()=>M.restore(JSON.stringify(broken)));
});
test('native minimum-price floor is preserved and buying price never changes v011 judgment',()=>{
 const low=M.makeProduct({years:1,tier:'low'}),standard=M.makeProduct({years:1,tier:'standard'});assert.equal(low.price,16);assert.equal(low.price,standard.price);const p=M.makeProduct({years:20});const a=M.evaluatePurchase(p,'specialist',42,0,1),b=M.evaluatePurchase({...p,price:160},'specialist',42,0,1);assert.deepEqual(a,b);
});
test('CSV purchase rows sum to real sales and receipts without multiplying group totals',()=>{
 const s=sell(),lines=M.csv(s).trim().split('\r\n'),rows=lines.slice(1).map(l=>l.split('","'));assert.equal(rows.length,s.products[0].sold);assert.equal(rows.reduce((n,r)=>n+Number(r[8]),0),s.products[0].sold);assert.equal(Math.round(rows.reduce((n,r)=>n+Number(r[9]),0)*100)/100,s.revenue);
});
test('many allocations and recalls keep conservation, including previous unsold product',()=>{
 for(let seed=1;seed<=100;seed++){let s=M.create({seed});s=stage(s,'diner','1');s=stage(s,'bar','1');s=act(s,'confirm');s=act(s,'advance',{months:1});for(const d of M.SHOPS)if(s.products[0].shops[d.id])s=act(s,'recall',{productId:1,shopId:d.id});s=act(s,'next',{sample:'deep',years:15,tier:'high'});s=act(stage(s,'specialist'),'confirm');s=act(s,'advance',{months:3});s=act(s,'select',{productId:1});if(M.freeHand(s)>0)s=act(stage(s,'bar'),'confirm');s=act(s,'advance',{months:3});assert.ok(M.validate(s));assert.equal(M.serialize(M.restore(M.serialize(s))),M.serialize(s));}
});
