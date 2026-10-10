'use strict';
// Read-only reference scenes and canonical 02 Engine/Codea with DOM doubles.
// Native offscreen Canvas; not a browser/device capture.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const repo=path.resolve(__dirname,'../../..');
async function originalRunner(){
  const D=require(repo+'/works/pumpoko/dynamics.js'),J=require(repo+'/works/pumpoko/journey.js');
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

  config.setup(); const scene=config.scenes.main;scene.draw();const title=canvas.toBuffer('image/png');
  scene.touch({id:1,state:'began',x:195,y:375});
  for(let i=0;i<1800&&w.PumpkinProbe().loose<9;i++){
    scene.touch({id:1,state:'moving',x:195+79*Math.sin(i/60*2.3),y:375-70*Math.cos(i/60*2.3)});scene.update(1/60);
  }
  assert.equal(w.PumpkinProbe().loose,9);scene.touch({id:1,state:'ended',x:195,y:375});
  return {canvas,title,frame:()=>{scene.update(1/60);scene.draw()},probe:()=>w.PumpkinProbe()};
}
function runner(ref){
 const h=harness({native:true,width:390,height:740,sourceRef:ref}),title=h.renderCanvas.toBuffer('image/png');
 for(let i=0;i<1800&&h.probe().prologue.loose<9;i++){
  if(i%30===0){h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.key('keydown',i%60===0?'ArrowRight':'ArrowLeft');}h.frame();
 }
 assert.equal(h.probe().prologue.loose,9);h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');
 return {canvas:h.renderCanvas,title,frame:h.frame,probe:h.probe};
}

(async()=>{
 const {mkdtempSync,rmSync}=fs,{tmpdir}=require('node:os'),{execFileSync}=require('node:child_process');
 const temporary=mkdtempSync(path.join(tmpdir(),'pumpoko-entry-'));
 const out=path.resolve(__dirname,'../visual-review');fs.mkdirSync(out,{recursive:true});
 const runs=[await originalRunner(),runner('b40842a3b919277ad432f3452e98e366ea980d92'),runner(null)];
 const names=['Original PUMPOKO','02 before (#183)','02 revised: scale / time'];
 const sheet=createCanvas(1170,790),c=sheet.getContext('2d'),selected=[];
 try {
  for(let i=0;i<165;i++){
   c.fillStyle='#faf1dc';c.fillRect(0,0,1170,790);
   for(let j=0;j<runs.length;j++){
    const r=runs[j];if(i>12)for(let k=0;k<4;k++)r.frame();
    c.drawImage(i<12?await loadImage(r.title):r.canvas,j*390,30);
    c.fillStyle='#695539';c.font='15px sans-serif';c.fillText(names[j],j*390+10,22);
   }
   c.fillStyle='#695539';c.fillText(`After actual detachment: ${Math.max(0,(i-12)/15).toFixed(2)}s | native Canvas / no audio / no retiming`,10,786);
   const bytes=sheet.toBuffer('image/png');fs.writeFileSync(path.join(temporary,String(i).padStart(4,'0')+'.png'),bytes);
   if(i%15===12)selected.push(bytes);
   c.getImageData(0,0,1,1);if(global.gc)global.gc();
  }
  assert.equal(runs[0].probe().mode,'journey');
  for(const r of runs.slice(1)){assert.equal(r.probe().phase,'playing');assert.equal(r.probe().model.handoffs,0);}
  const strip=createCanvas(1560,3*340),sc=strip.getContext('2d');sc.fillStyle='#faf1dc';sc.fillRect(0,0,strip.width,strip.height);
  for(let j=0;j<3;j++){
   sc.fillStyle='#695539';sc.font='16px sans-serif';sc.fillText(names[j]+' — elapsed seconds after detachment, left to right',8,j*340+19);
   for(let i=0;i<10;i++){
    sc.drawImage(await loadImage(selected[i]),j*390,30,390,740,i*156,j*340+27,156,296);
    sc.fillStyle='#695539';sc.font='12px sans-serif';sc.fillText(i+'s',i*156+70,j*340+337);
   }
  }
  fs.writeFileSync(path.join(out,'opening-sequence.png'),strip.toBuffer('image/png'));
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(temporary,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','26','-movflags','+faststart',path.join(out,'opening-film.mp4')]);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',path.join(out,'opening-film.mp4')],{encoding:'utf8'}));
  assert.equal(Number(probe.format.duration),11);assert.equal(Number(probe.streams[0].nb_frames),165);
  console.log(JSON.stringify({out,frames:165,fps:15,duration:11,baseline:'b40842a3b919277ad432f3452e98e366ea980d92',alignment:'actual nine-seed detachment + .8s title still; native timings, 60Hz updates',capture:'native Canvas / DOM doubles, no audio or device evidence',probe}));
 }finally{rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
