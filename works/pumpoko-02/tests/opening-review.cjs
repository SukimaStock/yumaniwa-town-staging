'use strict';
// Read-only reference scenes and canonical 02 Engine/Codea with DOM doubles.
// Native offscreen Canvas; not a browser/device capture.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const repo=path.resolve(__dirname,'../../..'),base='b40842a3b919277ad432f3452e98e366ea980d92';
async function original(){
  const D=require('../../pumpoko/dynamics.js'),J=require('../../pumpoko/journey.js');
  const canvas=createCanvas(390,740),c=canvas.getContext('2d'),held=new Set();let config;
  const logo=await loadImage(path.join(repo,'works/pumpoko/assets/pumpoko-logo.svg'));
  const element=()=>({addEventListener(){},setAttribute(){},textContent:''}),els={'title-art':logo,'gameCanvas':element(),'sound-toggle':element()};
  const w={console,Path2D,location:{search:'?dev=1'},URLSearchParams,window:null,
    SUKIMASTOCK_WORK:{id:'pumpoko',title:'PUMPOKO',logicalWidth:390,logicalHeight:740,frameRate:60},
    PumpkinDynamics:D,PumpkinJourney:J,BEGAN:'began',MOVING:'moving',ENDED:'ended',CANCELLED:'cancelled',
    document:{getElementById:id=>els[id]||(els[id]=element()),createElement:tag=>tag==='canvas'?createCanvas(390,740):element(),body:{appendChild(){}}},
    SSE:{createApp:v=>config=v,audio:{withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),preload(){},play(){},enabled:true},input:{action:n=>held.has(n),actionPressed:()=>false,reset:()=>held.clear()}},
    withCanvasContext:fn=>{c.save();c.translate(0,740);c.scale(1,-1);fn(c);c.restore();}};w.window=w;
  for(const file of ['stage-draw.js','sketch.js'])vm.runInNewContext(fs.readFileSync(path.join(repo,'works/pumpoko',file),'utf8'),w,{filename:file});
  config.setup();const scene=config.scenes.main,frames=[];
  const capture=label=>{scene.draw();frames.push({label,bytes:canvas.toBuffer('image/png')});};
  capture('Title');scene.touch({id:1,state:'began',x:195,y:375});
  for(let i=0;i<1800&&w.PumpkinProbe().mode==='prologue';i++){
    scene.touch({id:1,state:'moving',x:195+79*Math.sin(i/60*2.3),y:375-70*Math.cos(i/60*2.3)});scene.update(1/60);
  }
  assert.equal(w.PumpkinProbe().mode,'transition');scene.touch({id:1,state:'ended',x:195,y:375});
  for(const [progress,label]of[[.50,'Expanding cut'],[.72,'Seeds falling']]){
    while(w.PumpkinProbe().mode==='transition'&&w.PumpkinProbe().transition<progress)scene.update(1/60);capture(label);
  }
  const note=createCanvas(390,740),nc=note.getContext('2d');nc.fillStyle='#faf1dc';nc.fillRect(0,0,390,740);
  nc.fillStyle='#695539';nc.font='16px sans-serif';nc.textAlign='center';nc.fillText('No growth in original opening',195,345);nc.fillText('Seeds continue into play',195,374);
  frames.push({label:'Growth happens in the ending',bytes:note.toBuffer('image/png')});
  while(w.PumpkinProbe().mode==='transition')scene.update(1/60);capture('Seed play begins');return frames;
}
function version(sourceRef){
  const h=harness({native:true,width:390,height:740,sourceRef}),frames=[];
  const capture=label=>frames.push({label,bytes:h.renderCanvas.toBuffer('image/png')});
  capture('Title');
  for(let i=0;i<1800&&h.probe().phase==='title';i++){
    if(i%30===0){h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.key('keydown',i%60===0?'ArrowRight':'ArrowLeft');}h.frame();
  }
  assert.equal(h.probe().phase,'opening');h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');
  const times=sourceRef?[[1.3,'Expanded cut'],[2.65,'Matched rim / falling seeds'],[4.5,'Three fruits'],[6.2,'Hero begins']]
    :[[2.3,'Perimeter disappears'],[4.2,'Space / falling seeds'],[6.4,'Fruit in the landscape'],[7.2,'Same hero begins']];
  let time=0;for(const [at,label]of times){h.advance(at-time);time=at;capture(label);}assert.deepEqual(h.errors,[]);return frames;
}
(async()=>{
  const rows=[{label:'Original PUMPOKO reference',frames:await original()},
    {label:'PUMPOKO 02 before (#183)',frames:version(base)},
    {label:'PUMPOKO 02 corrected',frames:version(null)}];
  const sheet=createCanvas(1950,3*790),c=sheet.getContext('2d');c.fillStyle='#faf1dc';c.fillRect(0,0,sheet.width,sheet.height);
  for(const [row,r]of rows.entries()){
    c.fillStyle='#695539';c.font='18px sans-serif';c.textAlign='left';c.fillText(r.label,10,row*790+23);
    for(const [col,f]of r.frames.entries()){
      c.drawImage(await loadImage(f.bytes),col*390,row*790+32);
      c.fillStyle='#695539';c.font='14px sans-serif';c.textAlign='center';c.fillText(f.label,col*390+195,row*790+786);
    }
  }
  const out=path.resolve(__dirname,'../visual-review/opening-comparison.png');fs.writeFileSync(out,sheet.toBuffer('image/png'));
  console.log(JSON.stringify({out,rows:3,scenes:5,original:'read-only scene reference; no opening growth',before:base,current:'canonical Engine/Codea + DOM doubles; native Canvas'}));
})().catch(e=>{console.error(e);process.exitCode=1});
