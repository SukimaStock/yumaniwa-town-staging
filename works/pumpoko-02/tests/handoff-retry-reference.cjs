'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const BASE='dff988a941f609a0826af85585f36411c6ba8fed';
const before="      const spec=stageSpec(world),body=world.entities[cp.entityIndex];\n      Object.assign(body,fruit(cp.active,spec.spawnX,spec.layer,false,s.course),{grounded:true});world[cp.active]=body;";
const after="      // Resume the actual outgoing launch saved at the baton handoff.\n      // Grounding at spawnX would skip the socket and part of the new stage.\n      const body=world.entities[cp.entityIndex];\n      Object.assign(body,JSON.parse(JSON.stringify(cp.body)));world[cp.active]=body;";
function priorRestore(source){assert.equal(source.split(after).length,2,'exactly one approved restore replacement');return source.replace(after,before);}
function protect(){
 const root=__dirname+'/..',source=fs.readFileSync(root+'/world.js','utf8');
 assert.equal(priorRestore(source),execFileSync('git',['show',BASE+':works/pumpoko-02/world.js'],{encoding:'utf8'}),'whole world exact except approved restore');
 for(const file of ['courses.js','physics.js','story.js','app.js','world-draw.js','draw.js','opening.js','opening-draw.js','prologue.js','title-draw.js','index.html','style.css'])assert.ok(fs.readFileSync(root+'/'+file).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+file])),file+' fresh-base byte match');
}
function restoredBody(actual,expected){assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),'exact saved handoff body including position, motion and launch flags');}
// Historical terrain experiments keep their approved stationary initial fixture.
// Actual retry tests use the new saved handoff launch and never call this helper.
let fixtureRuntime;
function terrainReviewStart(s){
 fixtureRuntime??=require('./harness.cjs').harness({sourceRef:BASE}).w.FruitLabWorld;
 s.world=fixtureRuntime.restoreCheckpoint(s.world,s.stage1Start);s.look=0;s.view={...s.world.camera,z:.8};return s;
}
module.exports={BASE,priorRestore,protect,restoredBody,terrainReviewStart};
