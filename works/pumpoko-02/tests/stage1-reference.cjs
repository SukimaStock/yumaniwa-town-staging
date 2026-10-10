'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const BASE='3063834fdedf034c26db009f3f5e0d42c0555cc2',SHIFT=require('../courses.js').get('world4').stage1.shift;
const repo=path.resolve(__dirname,'../../..');
const source=file=>execFileSync('git',['show',BASE+':works/pumpoko-02/'+file],{cwd:repo,encoding:'utf8'});
const x=(layer,value)=>value+(layer==='surface'?0:SHIFT);
function protectPhysics(){
 const old=require('./harness.cjs').harness({sourceRef:BASE}).w.FruitLabPhysics,now=require('../physics.js');
 for(const key of ['PARAMETERS','STEP','G','LIMIT','SPEED'])assert.equal(JSON.stringify(now[key]),JSON.stringify(old[key]),key);
 assert.equal(JSON.stringify(now.defaults()),JSON.stringify(old.defaults()));
 const a=source('physics.js'),b=fs.readFileSync(path.join(__dirname,'../physics.js'),'utf8');
 for(const [start,end]of [['  function defaults(', '  function integrate('],['  function handoff(', '  return {']])
  assert.equal(b.slice(b.indexOf(start),b.indexOf(end)),a.slice(a.indexOf(start),a.indexOf(end)),start+' remains exact');
 // The only integrator extension accepts an absent support/frame. Removing
 // those two guards must recover the exact accepted contact/air/rolling code.
 const normalized=b.replace(/    \/\/ Optional finite work terrain[^]*?    b.pulse/, '    b.pulse')
  .replace(/        if \(next.support === false\) b.grounded = false;\n        else \{\n/, '')
  .replace('        b.vx = v * next.tx; b.vy = v * next.ty;\n        }','        b.vx = v * next.tx; b.vy = v * next.ty;');
 assert.equal(normalized,a,'the complete previous integrator remains exact except optional no-support guards');
}
module.exports={BASE,SHIFT,x,source,protectPhysics};
