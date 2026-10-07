'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load({locale='ja',work=root, storage=new Map(),pathname='/yumaniwa-town-staging/works/orbit-02/'}={}) {
  const data = JSON.parse(fs.readFileSync(path.join(work,'text',locale+'.json')));
  const calls = [];
  const storageAPI={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const context = {console,URLSearchParams,Set,Map,Math:Object.create(Math),Date,performance:{now:()=>0},
    BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',LEFT:'LEFT',CENTER:'CENTER',RIGHT:'RIGHT',
    window:{location:{pathname,search:''},localStorage:storageAPI,addEventListener(){}},
    document:{hidden:false,addEventListener(){},createElement:()=>({}),getElementById:()=>null},
    SSE:{audio:{enabled:false},createApp:options=>context.app=options,app:{replace(...v){calls.push(v)}},ui:{hit:(t,r)=>!!r&&t.x>=r.x&&t.x<=r.x+r.w&&t.y>=r.y&&t.y<=r.y+r.h}},
    CodeaLite:{},setTimeout(){},clearTimeout(){}, requestAnimationFrame(){}};
  context.window.OrbitText={isReady:()=>true,locale,get:key=>key.split('.').reduce((v,k)=>v[k],data),t(key,vars={}){const v=this.get(key); if(typeof v!=='string') throw Error('missing '+key);return v.replace(/\{(\w+)\}/g,(m,k)=>k in vars?vars[k]:m)}};
  context.OrbitText=context.window.OrbitText;
  const drawing=[];
  for (const name of ['fill','stroke','strokeWidth','noStroke','noFill','rect','ellipse','line','font','fontSize','textAlign','text','background','pushStyle','popStyle','pushMatrix','popMatrix','translate','rotate','scale']) context[name]=(...args)=>drawing.push([name,...args]);
  vm.createContext(context);
  // Test-only lexical access, never shipped as a production debug API.
  const src=fs.readFileSync(path.join(work,'sketch.js'),'utf8').replace('const world = new DriftWorld();','const world = new DriftWorld(); globalThis.testWorld = world; globalThis.testClass = DriftWorld; globalThis.testSave = SAVE_TUNE;');
  vm.runInContext(src,context,{filename:path.join(work,'sketch.js')});
  return {world:context.testWorld,World:context.testClass,save:context.testSave,context,storage,calls,drawing,data};
}
function home(w) {w.mode='landed';w.landPlanet=w.fixedPlanets.find(p=>p.kind==='base');w.eve.timer=0;w.openHomeTerminal();w.homeTerminal.opening=false;}
function finish(w) {w.updateNarrative(20);}
function tap(w,r) {const p={x:r.x+r.w/2,y:r.y+r.h/2};w.touch({...p,state:'BEGAN'});w.touch({...p,state:'ENDED'});}
module.exports={load,home,finish,tap,root};
