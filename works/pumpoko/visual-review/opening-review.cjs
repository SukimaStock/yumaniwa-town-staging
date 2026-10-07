// Offscreen Canvas + real scene.touch/update. Not browser/device verification.
const fs=require('fs'),vm=require('vm'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const repo=process.argv[2],out=process.argv[3];fs.mkdirSync(out,{recursive:true});
const base='0c1a67b1a617e0ca05418e518ec19f2fff46119c';
const D=require(path.join(repo,'works/pumpoko/dynamics.js')),J=require(path.join(repo,'works/pumpoko/journey.js'));
for(const f of ['stage-draw.js','dynamics.js','journey.js','stage-data.js','stage-geometry.js','codea-lite.js','work-config.js'])
 assert.equal(fs.readFileSync(path.join(repo,'works/pumpoko',f),'utf8'),cp.execFileSync('git',['show',base+':works/pumpoko/'+f],{cwd:repo,encoding:'utf8'}),f+' is protected');
const getSketch=ref=>ref?cp.execFileSync('git',['show',ref+':works/pumpoko/sketch.js'],{cwd:repo,encoding:'utf8'}):fs.readFileSync(path.join(repo,'works/pumpoko/sketch.js'),'utf8');
const current=getSketch(),old=getSketch(base);
assert.equal(current.slice(current.indexOf('  function seed('),current.indexOf('  function vessel(')),old.slice(old.indexOf('  function seed('),old.indexOf('  function vessel(')),'seed shape, shade and colors');
assert.deepEqual(current.match(/^.*(?:flesh|interior)\.addColorStop.*$/gm),old.match(/^.*(?:flesh|interior)\.addColorStop.*$/gm),'appetizing orange stops');
const behavior=s=>s.slice(s.indexOf('  function returnToTitle()')).replace('hint = 1; ','').replace('      if (touchedOnce) hint *= Math.exp(-dt * .8);\n','');
assert.equal(behavior(current),behavior(old),'all touch/update/audio/return code except obsolete hint bookkeeping');
async function harness(version,search){
 let config, model;const held=new Set(),canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 const logo=await loadImage(path.join(repo,'works/pumpoko/assets/pumpoko-logo.svg'));logo.complete=true;logo.naturalWidth=2064;
 const element=()=>({addEventListener(){},setAttribute(){}}), els={ 'title-art':logo,'gameCanvas':element(),'sound-toggle':element()};
 const w={console,Path2D,location:{search},URLSearchParams,window:null,SUKIMASTOCK_WORK:{id:'pumpoko',title:'PUMPOKO',logicalWidth:390,logicalHeight:740,frameRate:60},PumpkinDynamics:D,PumpkinJourney:{...J,create(...a){return model=J.create(...a)}},BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',
 document:{getElementById:id=>els[id]||(els[id]=element()),createElement:tag=>tag==='canvas'?createCanvas(390,740):element(),body:{appendChild(){}}},
 SSE:{createApp:v=>config=v,audio:{withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),preload(){},play(){},enabled:true},input:{action:n=>held.has(n),actionPressed:()=>false,reset:()=>held.clear()}},withCanvasContext:fn=>{ctx.save();ctx.translate(0,740);ctx.scale(1,-1);fn(ctx);ctx.restore();}};w.window=w;
 for(const file of ['stage-draw.js','sketch.js']){const p='works/pumpoko/'+file,src=version==='before'?cp.execFileSync('git',['show',base+':'+p],{cwd:repo,encoding:'utf8'}):fs.readFileSync(path.join(repo,p),'utf8');vm.runInNewContext(file==='sketch.js'?src.replace('})(window);','root.reviewModel=()=>model;root.reviewOpenAt=()=>openAt;})(window);'):src,w);}
 config.setup();return {w,ctx,canvas,scene:config.scenes.main,held,get model(){return w.reviewModel()},draw(){const before=JSON.stringify(w.PumpkinProbe());ctx.clearRect(0,0,390,740);config.scenes.main.draw();assert.equal(JSON.stringify(w.PumpkinProbe()),before,'drawing must leave gameplay state unchanged');return canvas}};
}


function stateJSON(state) {
 const seen=new Map();
 return JSON.stringify(state,(_,v)=>{if(v&&typeof v==='object'){if(seen.has(v))return {$ref:seen.get(v)};seen.set(v,seen.size)}return v});
}
function instrument(a) {
 a.strokes=[];a.logoY=[];a.text=[];a.detail=[];a.seedDraws=0;
 const stroke=a.ctx.stroke.bind(a.ctx);a.ctx.stroke=(...args)=>{a.strokes.push({style:a.ctx.strokeStyle,alpha:a.ctx.globalAlpha});return stroke(...args)};
 const image=a.ctx.drawImage.bind(a.ctx);a.ctx.drawImage=(...args)=>{if(args[0].naturalWidth===2064)a.logoY.push(a.ctx.getTransform().f + args[2]);return image(...args)};
 const text=a.ctx.fillText.bind(a.ctx);a.ctx.fillText=(...args)=>{a.text.push(args[0]);return text(...args)};
 const m=a.w.PumpkinStageDraw.mottling;a.w.PumpkinStageDraw.mottling=(...args)=>{a.detail.push(args[6]);return m(...args)};
 const d=a.w.PumpkinStageDraw.draw;a.w.PumpkinStageDraw.draw=(c,s,seed,...rest)=>d(c,s,(...args)=>{a.seedDraws++;return seed(...args)},...rest);
 a.capture=()=>{a.strokes=[];a.logoY=[];a.text=[];a.detail=[];a.seedDraws=0;return a.draw()};
 return a;
}
function png(a,name){fs.writeFileSync(path.join(out,name+'.png'),a.capture().toBuffer('image/png'))}
function crop(a,x,y,w,h){const image=createCanvas(w,h);image.getContext('2d').drawImage(a.canvas,x,y,w,h,0,0,w,h);return image.toBuffer('image/png')}
async function sheet(names,output){const image=createCanvas(820,names.length*395),c=image.getContext('2d');c.fillStyle='#ede5d7';c.fillRect(0,0,image.width,image.height);c.font='16px sans-serif';
for(const [i,name]of names.entries())for(const [j,v]of ['before','after'].entries()){c.fillStyle='#574d3c';c.fillText(v+' / '+name,410*j+12,395*i+20);c.drawImage(await loadImage(path.join(out,v+'-'+name+'.png')),410*j+100,395*i+25,195,370)}fs.writeFileSync(path.join(out,output+'.png'),image.toBuffer('image/png'))}
(async()=>{
 const a=instrument(await harness('before','?dev=1')),b=instrument(await harness('after','?dev=1'));
 png(a,'before-title');png(b,'after-title');assert.ok(crop(a,40,220,310,300).equals(crop(b,40,220,310,300)),'initial pumpkin material identical');
 const touch=e=>{a.scene.touch(e);b.scene.touch(e)};touch({id:42,state:'BEGAN',x:195,y:375});
 let looseAt=null,start=null,frames=0;const detailFrames=[];const fadeShots=[['loose',0],['fiber-fade',.75],['clean-cut',1.35]],openingShots=[['opening-start',.002],['opening-detail',.43],['opening-wide',.50],['opening-land',.65]];
 for(let i=0;i<30*60;i++){
 if(looseAt===null)touch({id:42,state:'MOVING',x:195+79*Math.sin(i/60*2.3),y:375-70*Math.cos(i/60*2.3)});
 a.scene.update(1/60);b.scene.update(1/60);
 assert.equal(stateJSON(b.model),stateJSON(a.model),'entire gameplay model must match every touch/update frame');
 const p=b.w.PumpkinProbe();
 if(p.loose===9&&looseAt===null){looseAt=i/60;touch({id:42,state:'ENDED',x:195,y:375})}
 if(p.mode==='transition'&&start===null){start=i/60;assert.ok(Math.abs(start-looseAt-1.8)<1/60)}
 if(looseAt!==null&&i%3===0){
  png(a,`before-frame-${i}`);png(b,`after-frame-${i}`);frames++;
  assert.ok(!b.text.includes('つかんで、ゆらす'));
  if(p.mode==='prologue'){
   const elapsed=b.model.time-b.w.reviewOpenAt();
   if(elapsed>=1.3)assert.ok(!b.strokes.some(v=>v.style==='#ffe0a6'||String(v.style).startsWith('rgba(246, 200, 124')),'no attachment/track stroke after cleanup');
  }
  if(p.mode==='transition'){
   if(p.transition>=.34&&p.transition<=.53)detailFrames.push([i,p.transition]);
   assert.equal(b.seedDraws,9,'only the nine real gameplay seeds');
   if(J.opening(b.model)>=.12)assert.ok(b.detail.every(v=>v===0),'no magnified local shell specks');
  }
 }
 for(const [name,t]of fadeShots.slice())if(looseAt!==null&&p.mode==='prologue'&&i/60-looseAt>=t){png(a,'before-'+name);png(b,'after-'+name);if(name==='fiber-fade'){const fibers=b.strokes.filter(v=>v.style==='#ffe0a6');assert.ok(fibers.length&&fibers.every(v=>v.alpha>0&&v.alpha<1),'fiber fade intermediate opacity')}fadeShots.splice(fadeShots.findIndex(v=>v[0]===name),1)}
 for(const [name,t]of openingShots.slice())if(p.mode==='transition'&&p.transition>=t){png(a,'before-'+name);png(b,'after-'+name);
 if(name==='opening-wide'){
  const m=a.w.PumpkinStageDraw.mottling;a.w.PumpkinStageDraw.mottling=()=>{};png(a,'isolation-no-shell-mottling');a.w.PumpkinStageDraw.mottling=m;
  const d=a.w.PumpkinStageDraw.draw;a.w.PumpkinStageDraw.draw=(c,s,seed,...rest)=>d(c,s,()=>{},...rest);png(a,'isolation-no-real-seeds');a.w.PumpkinStageDraw.draw=d;
 }
 openingShots.splice(openingShots.findIndex(v=>v[0]===name),1)}
 if(p.mode==='journey'){png(a,'before-stage-entry');png(b,'after-stage-entry');assert.deepEqual(fs.readFileSync(path.join(out,'before-stage-entry.png')),fs.readFileSync(path.join(out,'after-stage-entry.png')),'Stage 1 entry identical');break}
 }
 assert.notEqual(start,null);assert.equal(fadeShots.length,0);assert.equal(openingShots.length,0);
 // Logo motion measured through real drawImage transform, not simulated physics.
 const logo=instrument(await harness('after','?dev=1'));const ys=[];
 for(let i=0;i<=7*60;i++){logo.capture();if(logo.logoY.length)ys.push(logo.logoY[0]);logo.scene.update(1/60)}
 assert.ok(Math.max(...ys)-Math.min(...ys)>2.3&&Math.max(...ys)-Math.min(...ys)<=2.41);
 assert.ok(logo.text.includes('SukimaStock'));assert.ok(!logo.text.includes('つかんで、ゆらす'));
 // Existing growth / Hero return; the restored logo begins from the same pose.
 const e=instrument(await harness('before','?dev=1&ending=9&reward=.5')),f=instrument(await harness('after','?dev=1&ending=9&reward=.5'));
 let ending=false,previousReturnY=null;
 for(let i=0;i<15*60;i++){e.scene.update(1/60);f.scene.update(1/60);assert.equal(stateJSON(e.model),stateJSON(f.model),'ending and title models identical');
 const p=f.w.PumpkinProbe();
 if(p.ending&&p.ending.elapsed>=6.2&&!ending){png(e,'before-ending');png(f,'after-ending');assert.deepEqual(e.canvas.toBuffer('image/png'),f.canvas.toBuffer('image/png'),'ripe fruit, field, shading identical');ending=true}
 f.capture();if(p.ending?.titleMix>0)previousReturnY=f.logoY[0];
 if(p.mode==='prologue'){png(f,'after-returned-title');assert.ok(Math.abs(f.logoY[0]-previousReturnY)<.03,'no logo position snap on return');assert.ok(f.text.includes('SukimaStock'));break}
 }
 assert.ok(ending);assert.notEqual(previousReturnY,null);
 await sheet(['title','loose','fiber-fade','clean-cut'],'title-fade-comparison');
 await sheet(['opening-start','opening-detail','opening-wide','opening-land','stage-entry'],'opening-comparison');
 const iso=createCanvas(1170,775),ic=iso.getContext('2d');ic.fillStyle='#ede5d7';ic.fillRect(0,0,1170,775);ic.font='16px sans-serif';
 for(const [i,name]of ['before-opening-wide','isolation-no-shell-mottling','isolation-no-real-seeds'].entries()){ic.fillStyle='#574d3c';ic.fillText(name,i*390+8,22);ic.drawImage(await loadImage(path.join(out,name+'.png')),i*390,35)}
 fs.writeFileSync(path.join(out,'opening-cause-isolation.png'),iso.toBuffer('image/png'));
 const strip=createCanvas(1140,Math.ceil(detailFrames.length/6)*305),sc=strip.getContext('2d');sc.fillStyle='#ede5d7';sc.fillRect(0,0,strip.width,strip.height);sc.font='13px sans-serif';
 for(const [n,[i,t]]of detailFrames.entries()){const x=n%6*190,y=Math.floor(n/6)*305;sc.fillStyle='#574d3c';sc.fillText('frame '+i+' / '+t.toFixed(3),x+4,y+18);sc.drawImage(await loadImage(path.join(out,'after-frame-'+i+'.png')),x+21,y+22,148,281)}
 fs.writeFileSync(path.join(out,'opening-detail-frames.png'),strip.toBuffer('image/png'));
 console.log(JSON.stringify({touch:true,looseAt,start,unchangedPause:start-looseAt,framePairs:frames,cadence:'every 3 frames at 60fps',detailReviewFrames:detailFrames.length,models:'exactly equal every update',stageEntry:'pixel-identical',ripeEnding:'pixel-identical',logoVerticalRange:Math.max(...ys)-Math.min(...ys),logoReturn:'continuous'},null,2));
})();
