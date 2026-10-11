'use strict';
const {createCanvas}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs'),{atStage}=require('./five-stage-review.cjs'),{render}=require('./stage1-review.cjs'),{BASE,withoutAccents}=require('./accents-reference.cjs');
const W=require('../world.js'),P=require('../physics.js');
function scene(stage,x,time=25){const s=atStage(stage),b=s.world[s.world.active],f=W.curve(b.layer,x,s.world.course);Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:0,vy:0,grounded:true,exiting:false});P.clearInput(s.world);s.world.time=time;s.view={x:b.x,y:b.y+70,z:.8};return s;}
function paint(api,s,bare=false){const canvas=createCanvas(390,740);const draw=()=>render(api,canvas.getContext('2d'),{world:s.world,view:s.view,nursery:null});if(bare)withoutAccents(api,draw);else draw();return canvas;}
function delta(a,b){const x=a.getContext('2d').getImageData(0,0,390,740).data,y=b.getContext('2d').getImageData(0,0,390,740).data;let count=0;for(let i=0;i<x.length;i+=4)if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2])count++;return {count,a:x,b:y};}
function motifs(api,s){const canvas=createCanvas(390,740),native=canvas.getContext('2d'),marks={cloud:0,stone:0,flower:0,bird:0,grass:0},style={fill:'',stroke:''};
 const c=new Proxy(native,{get(t,k){const v=Reflect.get(t,k,t);if(k==='ellipse')return(...args)=>{if(style.fill==='rgba(255,249,229,.82)')marks.cloud++;if(style.fill==='rgba(137,105,73,.20)')marks.stone++;if(style.fill==='rgba(168,126,133,.64)')marks.flower++;v.apply(t,args);};if(k==='stroke')return(...args)=>{if(style.stroke==='rgba(83,108,77,.30)')marks.bird++;if(style.stroke==='rgba(83,108,77,.65)')marks.grass++;v.apply(t,args);};return typeof v==='function'?v.bind(t):v;},set(t,k,v){if(k==='fillStyle')style.fill=v;if(k==='strokeStyle')style.stroke=v;return Reflect.set(t,k,v,t);}});
 render(api,c,{world:s.world,view:s.view,nursery:null});return marks;
}
module.exports={BASE,harness,scene,paint,delta,motifs};
