'use strict';
const assert=require('node:assert/strict');
const {Morning,follow,distanceToSegment}=require('./model.js');
function play(order,fps){const g=new Morning();order.forEach(id=>g.connect(id));g.run();while(g.mode==='run')g.update(1/fps);if(g.mode==='change'){g.replan();order.filter(id=>!g.done.includes(id)).forEach(id=>g.connect(id));g.run();while(g.mode==='run')g.update(1/fps);}return g.snapshot();}
const orders=[['coffee','bag','laundry','door'],['bag','coffee','laundry','door'],['coffee','laundry','bag','door'],['laundry','coffee','bag','door'],['bag','laundry','coffee','door'],['laundry','bag','coffee','door']];
for(const order of orders){const baseline=play(order,60);for(const fps of [30,120])assert.deepEqual(play(order,fps),baseline);console.log(order.join(' → '),baseline.mode,baseline.clock);}
assert.equal(play(orders[0],60).mode,'success');assert.equal(play(orders[1],60).mode,'success');assert.equal(play(orders[2],60).mode,'failure');
const g=new Morning();g.connect('coffee');g.connect('bag');assert.equal(g.connect('coffee'),true);assert.deepEqual(g.route,['coffee']);g.connect('start');assert.deepEqual(g.route,[]);assert.equal(g.run(),false);g.connect('door');g.run();g.update(1);assert.equal(g.mode,'failure');g.reset();assert.equal(g.clock,488);assert.equal(g.surprise,false);
let positions=[];for(const fps of [30,60,120]){let p=0;for(let i=0;i<fps;i++)p=follow(p,100,1/fps);positions.push(p);}assert.ok(Math.max(...positions)-Math.min(...positions)<1e-9);
assert.equal(distanceToSegment({x:50,y:2},{x:0,y:0},{x:100,y:0}).distance,2);
console.log('Rules, six permutations, reverse, missing tasks, reset and 30/60/120fps PASS');
