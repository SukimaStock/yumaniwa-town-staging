'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const BASE='d19ecf43bc5d3706a09e24fea0a60f8d21e49d87',repo=path.resolve(__dirname,'../../..');
const source=f=>execFileSync('git',['show',BASE+':works/pumpoko-02/'+f],{cwd:repo,encoding:'utf8'});
let cached;
const previous=()=>cached??=require('./harness.cjs').harness({sourceRef:BASE}).w;
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b));
function protectCourse(){
 const c=require('../courses.js').get('world4'),old=previous().FruitLabCourses.get('world4');
 const equal=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
 equal(c.curves.surface,old.curves.surface.map(p=>p[0]===3270?[3270,385,.35]:p[0]===3580?[3580,425,0]:p),'STAGE 1 exact apart from two approved phrase points');
 require('./phrases-reference.cjs').protect();equal(c.stage1,old.stage1,'STAGE 1 settings');
 equal(c.gaps.filter(g=>g.layer==='surface'),old.gaps,'complete STAGE 1 gaps');equal(c.holes[0],old.holes[0],'first socket');
 equal(c.surfaces,old.surfaces,'surface topology');
 for(const [i,h]of c.holes.entries())equal({...h,x:h.x-c.exitOffsets[i]},old.holes[i],'translated socket '+i);
 for(const layer of ['underground','return','underground2','finish']){
  equal(c.curves[layer].slice(0,3).map(p=>[p[0]-c.offsets[layer],...p.slice(1)]),old.curves[layer].slice(0,3),'entry shoulder '+layer);
  if(layer!=='finish'){const i=['underground','return','underground2'].indexOf(layer)+1;
   equal(c.curves[layer].slice(-3).map(p=>[p[0]-c.exitOffsets[i],...p.slice(1)]),old.curves[layer].slice(-3),'exit shoulder '+layer);
  }
 }
 equal(c.curves.finish.filter(p=>p[0]>=old.curves.finish[2][0]+c.goalOffset).map(p=>[p[0]-c.goalOffset,...p.slice(1)]),old.curves.finish.slice(2),'entire final approach/pocket');
 equal({...c.goal,x:c.goal.x-c.goalOffset},old.goal,'all goal constants');assert.equal(c.finishX-c.goalOffset,old.finishX);
 for(const [i,cell]of c.cellars.entries()){assert.equal(cell.exitRoof,old.cellars[i].exitRoof);assert.equal(cell.layer,old.cellars[i].layer);}
}
function protectRuntime(){
 assert.equal(read('physics.js'),source('physics.js'),'entire physics file exact fresh main');
 for(const file of ['app.js','title-draw.js','index.html','opening.js','opening-draw.js','prologue.js','material.js'])assert.equal(read(file),source(file),file);
 const a=read('world.js').replace('if(!hasGround(b.layer,f.x,course)||f.distance<0){const edge=edgeContact(b,course);if(edge)return edge;return emptyFrame;}','if(!hasGround(b.layer,f.x,course)||f.distance<0)return emptyFrame;'),b=source('world.js');
 for(const [start,end]of [['  function curve(', '  function create('],['  function hole(', '  function surfaceHeight('],['  function geometry(', '  function update(']])assert.equal(between(a,start,end),between(b,start,end),start+' exact protected kernel');
 const now=read('story.js'),old=source('story.js');
 const normalized=now.replace('const world=s.world.finale||s.world,a=world.pumpkin,b=world.holes.at(-1).occupant;','const a=s.world.pumpkin,b=s.world.holes.at(-1).occupant;').replace('for(const b of [(s.world.finale||s.world).pumpkin,(s.world.finale||s.world).holes.at(-1).occupant])','for(const b of [s.world.pumpkin,s.world.holes.at(-1).occupant])');
 assert.equal(between(normalized,'  function pair(','  function update('),between(old,'  function pair(','  function update('),'final shot functions exact');
 assert.equal(between(now,"    }else if(s.phase==='coast'||s.phase==='ending'){",'  function returnMix('),between(old,"    }else if(s.phase==='coast'||s.phase==='ending'){",'  function returnMix('),'entire ending/return branch exact');
 assert.equal(now.slice(now.indexOf('  function returnMix(')),old.slice(old.indexOf('  function returnMix(')),'dissolve exact');
 const files=execFileSync('git',['ls-tree','-r','--name-only',BASE,'works/pumpoko-02/assets/','works/pumpoko-02/audio/'],{cwd:repo,encoding:'utf8'}).trim().split('\n');
 for(const f of files)assert.ok(fs.readFileSync(path.join(repo,f)).equals(execFileSync('git',['show',BASE+':'+f],{cwd:repo,maxBuffer:10e6})),f);
}
module.exports={BASE,source,previous,protectCourse,protectRuntime};
