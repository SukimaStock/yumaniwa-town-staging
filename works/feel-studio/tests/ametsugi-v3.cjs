'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const studio=path.resolve(__dirname,'..'),repo=path.resolve(studio,'../..');
const read=p=>fs.readFileSync(path.join(studio,p),'utf8');
const catalog=JSON.parse(read('catalog.json'));
const project=catalog.projects.find(p=>p.id==='ametsugi');
const build=catalog.builds.find(b=>b.id==='ametsugi-a');
const host=require('../bridge-host.js');
const physics=read('prototypes/ametsugi/physics.js'),art=read('prototypes/ametsugi/art.js');
const app=read('prototypes/ametsugi/ametsugi-a/app.js'),html=read('prototypes/ametsugi/ametsugi-a/index.html'),play=read('prototypes/ametsugi/ametsugi-a/play.html');
const orig=p=>fs.readFileSync(path.join(repo,'works/ametsugi',p),'utf8');
function normalized(s){return s.replace(/^import .*;\s*$/m,'').replace(/\bexport (?=(?:const|function|class)\s)/g,'');}
assert(physics.includes(normalized(orig('game.mjs'))),'canonical physics must remain embedded verbatim');
assert(art.includes(normalized(orig('draw.mjs'))),'canonical drawing must remain embedded verbatim');
assert.equal(read('prototypes/ametsugi/style.css'),orig('style.css'));
for(const asset of [{path:build.source,sha256:build.codeHash},{path:build.url,sha256:build.htmlHash},...build.dependencies]){
 assert.equal(crypto.createHash('sha256').update(read(asset.path)).digest('hex'),asset.sha256,'asset SHA: '+asset.path);
}
assert(host.validateBuild(build),'installed immutable manifest');
assert.equal(build.runtime,'feel-bridge/1');
assert.equal(project.level,3);
assert(!/bridge-client\.js/.test(play),'independent work must not require Bridge');
assert(html.includes('bridge-client.js'));
assert(!/\.\.\/\.\.\/engine\//.test(html),'no cross-work privileged runtime');
new vm.Script(physics);new vm.Script(art);new vm.Script(app);
const context={window:{}};vm.runInNewContext(physics,context);vm.runInNewContext(art,context);
const {RainGame,COURSES,LIMIT}=context.window.AmetsugiPhysics;
const {RainDrawing}=context.window.AmetsugiDrawing;
const angles=[[.36],[.36,-.4],[.36,-.36,.4],[-.36,.36,-.44],[.32,-.32,.36,-.48]];
function until(g,test,hz=60,max=15){
 for(let i=0;i<max*hz;i++){g.update(1/hz);if(test(g))return;}
 assert.fail('ametsugi timed out '+JSON.stringify(g.snapshot()));
}
for(const hz of [5,15,30,60,120])for(const mirror of [false,true]){
 const g=new RainGame();g.lap=mirror?1:0;g.reset();g.start();
 for(let i=0;i<5;i++){
  angles[i].forEach((a,j)=>g.setAngle(j,mirror?-a:a));
  until(g,g=>g.phase==='caught',hz);
  assert.equal(g.level,i);assert.equal(g.drop.visited,COURSES[i].pans.length);assert.equal(g.failures,0);
  until(g,g=>g.phase==='end'||g.level!==i,hz,3);
 }
 assert.equal(g.phase,'end');assert.equal(g.filled,5);assert.equal(g.drag,null);
}
const g=new RainGame();g.setAngle(0,.2);g.pans[0].angle=.2;g.pending=.4;
assert.equal(g.pans[0].target,.2);assert.equal(g.pending,.4);
g.setAngle(0,9);assert.equal(g.pans[0].target,LIMIT);
const d=new RainDrawing(false);assert.equal(d.width,400);assert.equal(d.height,760);d.setLayout(true);assert.equal(d.width,830);
assert.equal(project.config.angle,0);assert.equal(project.config.wait,.85);
assert.equal(project.ranges.angle.min,-LIMIT);assert.equal(project.ranges.angle.max,LIMIT);
const {Desk}=require('../records-v2.js'),storage={getItem(){return null;},setItem(){}};
const desk=new Desk(catalog,'ametsugi',storage),init=desk.data.nodes[0],c=desk.config(init.id);
const branch=desk.branch(init.id,'傾きと間', 'author-edit',{...c,angle:.2,wait:.4});
assert.equal(branch.parent,init.id);assert.equal(desk.config(branch.id).angle,.2);
assert.equal(desk.node(init.id).config.angle,0);
assert.throws(()=>desk.validate({angle:.9,wait:.4}));
assert.throws(()=>desk.validate({angle:.2,wait:3}));
const request=desk.request(branch.id,[{nodeId:init.id,partId:'water'}],'水の動きだけ別案に','元の雨どい位置は残す');
assert.equal(request.base.codeHash,build.codeHash);assert.equal(request.selections[0].partId,'water');
console.log('PASS Ametsugi source parity, manifests, 50 complete roof paths, controls, saved branch and code request');
