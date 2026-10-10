'use strict';
// Offscreen native Canvas with canonical Engine/Codea. DOM doubles; not browser or device evidence.
const fs=require('node:fs'),path=require('node:path'),{harness}=require('./harness.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const h=harness({native:true,width:390,height:844}),frames=[];
function capture(label){frames.push({label,bytes:h.renderCanvas.toBuffer('image/png')});}
capture('Title');
for(let i=0;i<1800&&h.probe().phase==='title';i++){if(i%30===0){h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.key('keydown',i%60===0?'ArrowRight':'ArrowLeft');}h.frame();}
h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.advance(.7);capture('Seeds falling');h.advance(1.1);capture('On the soil');h.advance(1.2);capture('Three fruits');h.advance(1.4);capture('The same hero');h.key('keydown','ArrowRight');let swaps=0;
for(let i=0;i<5400&&!h.probe().finished;i++){
  if(i%40===0&&h.probe().model.active==='rutabaga'){h.key('keyup','ArrowRight');h.frame();h.key('keydown','ArrowRight');}h.frame();
  if(h.probe().model.handoffs>swaps){swaps=h.probe().model.handoffs;h.advance(.5);capture('Exchange '+swaps);}
}
h.key('keyup','ArrowRight');while(h.probe().phase==='coast')h.frame();h.advance(7);capture('Together');h.advance(5.6);capture('Return');
while(!h.probe().returnTitle)h.frame();capture('Title again');
if(h.errors.length)throw Error(h.errors.join('\n'));
const canvas=createCanvas(390*5,886*Math.ceil(frames.length/5)),c=canvas.getContext('2d');c.fillStyle='#faf1dc';c.fillRect(0,0,canvas.width,canvas.height);
for(const [i,frame]of frames.entries()){const img=await loadImage(frame.bytes);const x=i%5*390,y=Math.floor(i/5)*886;c.drawImage(img,x,y);c.fillStyle='#695539';c.font='16px sans-serif';c.textAlign='center';c.fillText(frame.label,x+195,y+871);}
const out=path.join(__dirname,'../visual-review/continuous-journey.png');fs.writeFileSync(out,canvas.toBuffer('image/png'));console.log(JSON.stringify({out,frames:frames.length,errors:h.errors}));

})().catch(e=>{console.error(e);process.exitCode=1;});
