'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process'),C=require('../courses.js'),{BASE,previous}=require('./phrases-review.cjs');
const json=v=>JSON.stringify(v);
function protect(){
 const c=C.get('world4'),old=previous().FruitLabCourses.get('world4');
 for(const key of Object.keys(old).filter(k=>!['curves','gaps'].includes(k)))assert.equal(json(c[key]),json(old[key]),key+' exact base');
 assert.equal(json(c.curves.return),json(old.curves.return),'accepted STAGE 3 exact');assert.equal(json(c.gaps.filter(g=>g.stage===3)),json(old.gaps.filter(g=>g.stage===3)));
 const bounds={surface:p=>![3270,3580].includes(p[0]),underground:p=>p[0]<7060||p[0]>9120,underground2:p=>p[0]<22340||p[0]>=24650,finish:p=>p[0]<31130||p[0]>32595};
 for(const [layer,keep]of Object.entries(bounds))assert.equal(json(c.curves[layer].filter(keep)),json(old.curves[layer].filter(keep)),layer+' unaffected authored points');
 const expected={second2:{a:7710,b:7830,runup:650},second4:{a:23540,b:23670,runup:1200},first5:{b:31290},second5:{a:31590,b:31730,runup:300}},ids={'stage2-2':'second2','stage4-3':'second4','stage5-2':'first5','stage5-3':'second5'};
 assert.equal(json(c.gaps),json(old.gaps.map(g=>({...g,...expected[ids[g.id]]}))),'only declared gaps move');
 for(const file of ['physics.js','world.js','story.js','world-draw.js','app.js','draw.js','index.html','opening.js','opening-draw.js','prologue.js','material.js','title-draw.js','style.css'])if(file==='world.js'){require('./handoff-retry-reference.cjs').protect();assert.equal(require('./handoff-retry-reference.cjs').priorRestore(fs.readFileSync(__dirname+'/../'+file,'utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/'+file],{encoding:'utf8'}),file+' byte match before approved retry change');}
  else if(file==='world-draw.js'){require('./fall-shadow-reference.cjs').protect();assert.equal(require('./fall-shadow-reference.cjs').priorShadow(fs.readFileSync(__dirname+'/../'+file,'utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/'+file],{encoding:'utf8'}),file+' exact before shadow fix');}
  else assert.ok(fs.readFileSync(__dirname+'/../'+file).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+file])),file+' byte match');
 for(const p of c.curves.surface.filter(p=>[3270,3580].includes(p[0])))assert.deepEqual(p,p[0]===3270?[3270,385,.35]:[3580,425,0]);
 for(const layer of Object.keys(bounds))assert.ok(c.curves[layer].every((p,i)=>!i||p[0]>c.curves[layer][i-1][0]));
 return {c,old};
}
module.exports={protect,BASE};
