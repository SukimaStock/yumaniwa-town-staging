// Offscreen Canvas + real scene.touch/update. Not browser/device verification.
const fs=require('fs'),vm=require('vm'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const repo=process.argv[2],out=process.argv[3];fs.mkdirSync(out,{recursive:true});
const base='c331b66589f0602706e6f587c36aaac5eba358d9';
const D=require(path.join(repo,'works/pumpoko/dynamics.js')),J=require(path.join(repo,'works/pumpoko/journey.js'));
for(const f of ['dynamics.js','journey.js','stage-data.js','stage-geometry.js','codea-lite.js','work-config.js'])
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
 const shots=[];let pairs=0;
 for(const count of [0,1,9])for(const reward of [0,1]) {
  const a=instrument(await harness('before',`?dev=1&ending=${count}&reward=${reward}`)),b=instrument(await harness('after',`?dev=1&ending=${count}&reward=${reward}`));
  let captured=false,returned=false,close=0;
  for(let i=0;i<18*60;i++) {
   a.scene.update(1/60);b.scene.update(1/60);
   assert.equal(stateJSON(a.model),stateJSON(b.model),'all ending/return state identical');
   const probe=b.w.PumpkinProbe();
   if(i%3===0){a.capture();b.capture();pairs++;
    if(probe.ending&&probe.ending.zoom===0)assert.ok(a.canvas.toBuffer('image/png').equals(b.canvas.toBuffer('image/png')),'normal ending pixels unchanged');
    if(probe.ending&&probe.ending.zoom>0&&count>0)close++;
   }
   if(count===9&&reward===0&&probe.ending){const z=probe.ending.zoom;
    for(const t of [0,.15,.3,.5,.7,.9])if(z>=t&&!shots.includes('hero-'+t)){const n='hero-'+t;png(a,'before-'+n);png(b,'after-'+n);shots.push(n)}
   }
   if(probe.mode==='prologue'){a.capture();b.capture();assert.ok(a.canvas.toBuffer('image/png').equals(b.canvas.toBuffer('image/png')),'returned title pixels unchanged');returned=true;break}
  }
  assert.ok(returned);console.log('ending',count,'reward',reward,'close-up frames',close);
 }
 const a=instrument(await harness('before','?dev=1')),b=instrument(await harness('after','?dev=1'));
 a.capture();b.capture();assert.ok(a.canvas.toBuffer('image/png').equals(b.canvas.toBuffer('image/png')),'normal title pixels unchanged');
 let loose=false,start=false,opening=[];
 for(let i=0;i<30*60;i++) {
  const touch=e=>{a.scene.touch(e);b.scene.touch(e)};
  if(i===0)touch({id:42,state:'BEGAN',x:195,y:375});
  if(!loose)touch({id:42,state:'MOVING',x:195+79*Math.sin(i/60*2.3),y:375-70*Math.cos(i/60*2.3)});
  a.scene.update(1/60);b.scene.update(1/60);assert.equal(stateJSON(a.model),stateJSON(b.model));
  const p=b.w.PumpkinProbe();
  if(p.loose===9&&!loose){loose=true;touch({id:42,state:'ENDED',x:195,y:375})}
  if(i%3===0){a.capture();b.capture();pairs++;
   if(p.mode==='transition'){assert.equal(b.seedDraws,9);for(const t of [.38,.42,.46,.5,.6])if(p.transition>=t&&!opening.includes('opening-'+t)){const n='opening-'+t;png(a,'before-'+n);png(b,'after-'+n);opening.push(n)}}
  }
  if(p.mode==='journey'){a.capture();b.capture();assert.ok(a.canvas.toBuffer('image/png').equals(b.canvas.toBuffer('image/png')),'Stage entry pixels unchanged');start=true;break}
 }
 assert.ok(start);
 // Scale/DPR/rotation: the same material policy for both surfaces.
 const c=createCanvas(390,740).getContext('2d'),draw=b.w.PumpkinStageDraw;
 for(const dpr of [1,2,3]){c.resetTransform();c.scale(dpr,dpr);draw.materialFrame(c);
  for(const scale of [1,1.75,2,2.5,3,7]){c.save();c.rotate(.72);c.scale(scale,scale);const detail=draw.textureDetail(c);assert.ok(Math.abs(detail-(scale<=2?1:scale>=3?0:.5))<1e-6);c.restore()}}
 await sheet(shots,'zoom-hero-comparison');await sheet(opening,'zoom-opening-comparison');
 console.log(JSON.stringify({pairs,models:'equal every update',normalTitle:'pixel identical',normalEnding:'pixel identical (0,1,9 arrivals / reward 0,1)',returnedTitle:'pixel identical',stageEntry:'pixel identical',dpr:'1/2/3 consistent',rotation:'invariant'},null,2));
})();
