'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const BASE='eed8bc652d005536ba9fbde77692ef1a8df0cbb3';
function priorAccents(source){
 const block=/  \/\/ BEGIN BACKGROUND ACCENTS[^]*?  \/\/ END BACKGROUND ACCENTS\n/g;
 assert.equal([...source.matchAll(block)].length,1,'one isolated decoration helper block');source=source.replace(block,'');
 for(const hook of ['    const accent=accentStrength(s,opening);\n    accentSky(c,s,camera,left,right,surface,accent);\n','    accentSoil(c,s,left,right,surface,accent);\n','    accentSprigs(c,s,left,right,accent);\n']){assert.equal(source.split(hook).length,2,'one decoration hook');source=source.replace(hook,'');}
 return source;
}
function protect(){
 const root=__dirname+'/..';assert.equal(priorAccents(fs.readFileSync(root+'/world-draw.js','utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/world-draw.js'],{encoding:'utf8'}),'all original renderer code exact');
 for(const f of ['courses.js','physics.js','world.js','story.js','app.js','draw.js','material.js','opening.js','opening-draw.js','prologue.js','title-draw.js','index.html','style.css'])assert.ok(fs.readFileSync(root+'/'+f).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+f])),f+' exact fresh main');
}
const cached=new WeakMap();
function withoutAccents(api,fn){
 const original=api.PumpokoWorldDraw;if(!original.toString().includes('accentStrength'))return fn();
 let bare=cached.get(api);if(!bare){const source=priorAccents(fs.readFileSync(__dirname+'/../world-draw.js','utf8'));bare=Function('window',source+'\nreturn window.PumpokoWorldDraw;')(api);cached.set(api,bare);api.PumpokoWorldDraw=original;}
 api.PumpokoWorldDraw=bare;try{return fn();}finally{api.PumpokoWorldDraw=original;}
}
module.exports={BASE,priorAccents,protect,withoutAccents};
