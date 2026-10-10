'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const BASE='5f146ae6221e4a606ab1c62abd673afa3fcbfdb1';
const before="        const floor=W.curve(b.layer,b.x,course).y,altitude=Math.max(0,b.y-b.r-floor);\n        c.save();if(hole)solid(c,left,right,bottom,surface,spaces);\n        A.ellipse(c,b.x,floor+2,b.r,4,`rgba(80,54,27,${.18/(1+altitude/80)})`);c.restore();";
const after="        const floor=W.curve(b.layer,b.x,course).y;\n        // A fruit below this ground cannot cast a shadow onto its upper side.\n        if(b.y>=floor){\n          const altitude=Math.max(0,b.y-b.r-floor);\n          c.save();if(hole)solid(c,left,right,bottom,surface,spaces);\n          A.ellipse(c,b.x,floor+2,b.r,4,`rgba(80,54,27,${.18/(1+altitude/80)})`);c.restore();\n        }";
function priorShadow(source){assert.equal(source.split(after).length,2,'one exact approved shadow edit');return source.replace(after,before);}
function protect(){
 const root=__dirname+'/..';assert.equal(priorShadow(fs.readFileSync(root+'/world-draw.js','utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/world-draw.js'],{encoding:'utf8'}),'whole renderer exact except below-ground shadow guard');
 for(const f of ['physics.js','world.js','courses.js','story.js','app.js','draw.js','material.js','opening.js','opening-draw.js','prologue.js','title-draw.js','index.html','style.css'])assert.ok(fs.readFileSync(root+'/'+f).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+f])),f+' exact fresh main');
}
module.exports={BASE,priorShadow,protect};
