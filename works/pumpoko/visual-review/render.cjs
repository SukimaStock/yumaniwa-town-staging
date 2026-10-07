const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm'),path=require('path'),cp=require('child_process');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const repo=process.argv[2], out=process.argv[3];fs.mkdirSync(out,{recursive:true});
const base='1b87ad41ec7c4f66e359ab30ed050a13b039576b';
const pr169='3470fc0b8978aeb966186f9aa6ec04c82166938c';
const versions=['before','pr169','after'];
// Follow-up may change only the original pumpkin gradient color stops.
for(const file of ['sketch.js','stage-draw.js']) {
 const p='works/pumpoko/'+file;
 const read=ref=>cp.execFileSync('git',['show',ref+':'+p],{cwd:repo,encoding:'utf8'});
 const current=fs.readFileSync(path.join(repo,p),'utf8');
 const gradients=/^.*(?:flesh|interior|body)\.addColorStop.*$/gm;
 assert.equal(current.replace(gradients,''),read(pr169).replace(gradients,''),file+' must preserve all non-pumpkin colors, texture, shadows and logic from PR169');
 assert.deepEqual(current.match(gradients),read(base).match(gradients),file+' pumpkin gradient stops must match before');
}
// Offscreen diagnostic fixtures, not browser/Safari or playability evidence.
const baselineSketch=cp.execFileSync('git',['show',base+':works/pumpoko/sketch.js'],{cwd:repo,encoding:'utf8'});
const candidateSketch=fs.readFileSync(path.join(repo,'works/pumpoko/sketch.js'),'utf8');
const withoutSeedAndVessel=s=>s.slice(0,s.indexOf('  function seed('))+s.slice(s.indexOf('  function shadow('));
assert.equal(withoutSeedAndVessel(candidateSketch),withoutSeedAndVessel(baselineSketch),'input/update/audio/setup and title cycle must remain byte-identical');
for(const file of ['journey.js','dynamics.js','stage-data.js','stage-geometry.js','codea-lite.js','index.html','work-config.js'])
 assert.equal(fs.readFileSync(path.join(repo,'works/pumpoko',file),'utf8'),cp.execFileSync('git',['show',base+':works/pumpoko/'+file],{cwd:repo,encoding:'utf8'}),file+' must stay unchanged');
const D=require(path.join(repo,'works/pumpoko/dynamics.js')),J=require(path.join(repo,'works/pumpoko/journey.js'));
async function harness(version,search){
 let config, model;const held=new Set(),canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 const logo=await loadImage(path.join(repo,'works/pumpoko/assets/pumpoko-logo.svg'));logo.complete=true;logo.naturalWidth=2064;
 const element=()=>({addEventListener(){},setAttribute(){}}), els={ 'title-art':logo,'gameCanvas':element(),'sound-toggle':element()};
 const w={console,Path2D,location:{search},URLSearchParams,window:null,SUKIMASTOCK_WORK:{id:'pumpoko',title:'PUMPOKO',logicalWidth:390,logicalHeight:740,frameRate:60},PumpkinDynamics:D,PumpkinJourney:{...J,create(...a){return model=J.create(...a)}},BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',
 document:{getElementById:id=>els[id]||(els[id]=element()),createElement:tag=>tag==='canvas'?createCanvas(390,740):element(),body:{appendChild(){}}},
 SSE:{createApp:v=>config=v,audio:{withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),preload(){},play(){},enabled:true},input:{action:n=>held.has(n),actionPressed:()=>false,reset:()=>held.clear()}},withCanvasContext:fn=>{ctx.save();ctx.translate(0,740);ctx.scale(1,-1);fn(ctx);ctx.restore();}};w.window=w;
 for(const file of ['stage-draw.js','sketch.js']){const p='works/pumpoko/'+file,src=version!=='after'?cp.execFileSync('git',['show',(version==='before'?base:pr169)+':'+p],{cwd:repo,encoding:'utf8'}):fs.readFileSync(path.join(repo,p),'utf8');vm.runInNewContext(src,w);}
 config.setup();return {w,ctx,canvas,scene:config.scenes.main,held,get model(){return model},draw(){const before=JSON.stringify(w.PumpkinProbe());ctx.clearRect(0,0,390,740);config.scenes.main.draw();assert.equal(JSON.stringify(w.PumpkinProbe()),before,'drawing must leave gameplay state unchanged');return canvas}};
}
function save(a,version,name){
 const logical=a.draw();fs.writeFileSync(path.join(out,version+'-'+name+'.png'),logical.toBuffer('image/png'));
 for(const [width,height] of [[390,844],[844,390]]) {
  const image=createCanvas(width,height),c=image.getContext('2d'),scale=Math.min(width/390,height/740);
  c.fillStyle='#f7edd8';c.fillRect(0,0,width,height);
  c.drawImage(logical,(width-390*scale)/2,(height-740*scale)/2,390*scale,740*scale);
  fs.writeFileSync(path.join(out,`${version}-${name}-${width}x${height}.png`),image.toBuffer('image/png'));
 }
}
(async()=>{
 for(const v of versions){
  let a=await harness(v,'?dev=1');save(a,v,'title');a.held.add('right');a.held.add('down');let captured=false;
  for(let i=0;i<40*60;i++){a.scene.update(1/60);const p=a.w.PumpkinProbe();if(!captured&&p.mode==='transition'&&p.transition>.38){save(a,v,'opening');captured=true;}if(p.mode==='journey')break;}
  a=await harness(v,'?dev=1&stage=1');
  for(const [name,x,y] of [['stage',950,280],['farm',1940,340]]){a.model.camera={x,y,z:J.ZOOM};save(a,v,name)}
  a=await harness(v,'?dev=1&ending=9&reward=.5');
  for(let i=0;i<100;i++){a.scene.update(1/60);if(a.model?.ending)break;}
  const shots=[['sprouts',2],['ending',6.2],['return',10.5],['returned-title',12.3]];
  for(const [name,t] of shots){while(a.w.PumpkinProbe().mode!=='prologue'&&a.model.ending.elapsed<t)a.scene.update(1/60);save(a,v,name)}
  // Measure repeatable offscreen draw cost; no hardware/browser FPS claim.
  const times=[];for(let i=0;i<100;i++){const start=performance.now();a.draw();times.push(performance.now()-start)}times.sort((x,y)=>x-y);console.log(v,'title-draw mean ms',times.reduce((x,y)=>x+y)/times.length,'p95',times[95]);
 }
 for(const name of ['stage','farm','sprouts'])
  assert.deepEqual(fs.readFileSync(path.join(out,'after-'+name+'.png')),fs.readFileSync(path.join(out,'pr169-'+name+'.png')),name+' pixels must be identical to PR169');
 console.log('PR169 vs follow-up: Stage 1, farm and sprouts pixel-identical; only pumpkin gradient stops changed.');
 const names=['title','opening','stage','farm','sprouts','ending','return','returned-title'];
 for(const group of [names.slice(0,4),names.slice(4)]){
  const sheet=createCanvas(1230,group.length*410),c=sheet.getContext('2d');c.fillStyle='#ede5d7';c.fillRect(0,0,sheet.width,sheet.height);c.fillStyle='#574d3c';c.font='18px sans-serif';
  for(const [i,name]of group.entries())for(const [j,v]of versions.entries()){c.fillText(v+' / '+name,j*410+15,i*410+25);c.drawImage(await loadImage(path.join(out,v+'-'+name+'.png')),j*410+100,i*410+35,195,370)}
  fs.writeFileSync(path.join(out,group[0]==='title'?'comparison-world.png':'comparison-cycle.png'),sheet.toBuffer('image/png'));
 }
})();
