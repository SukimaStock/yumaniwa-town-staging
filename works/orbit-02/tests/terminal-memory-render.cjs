'use strict';
// Optional real Canvas bounds/pixel QA; not physical iPhone evidence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {load,home,root}=require('./harness.cjs');
const out=path.resolve(process.argv[2]||'/tmp/orbit-02-terminal');fs.mkdirSync(out,{recursive:true});
for(const locale of ['ja','en']) {
 const a=load({locale}),{context:c,world:w}=a;
 vm.runInContext(fs.readFileSync(path.join(root,'codea-lite.js'),'utf8'),c);Object.assign(c,c.window);
 const canvas=createCanvas(360,640),ctx=canvas.getContext('2d');Object.assign(c.CodeaLite.state,{canvas,ctx,width:360,height:640});
 home(w);w.ship.pos={x:0,y:-160};w.camera={x:0,y:-160};w.echoes.found=12;w.openEchoArchive();
 const L=w.homeTerminalLayout(),R={x:L.x+3,y:L.y+3,w:L.w-6,h:L.h-L.titleH-5};
 for(let index=1;index<=12;index++) {
  w.eve.timer=0;w.echoStory.active=false;assert.notEqual(w.startEchoMemory(index,'archive'),false);w.echoStory.timer=3;
  ctx.setTransform(1,0,0,-1,0,640);w.draw();
  // Spy on actual adapter text/rect operations with its native font metrics.
  const rawText=c.text,rawRect=c.rect;c.text=(value,x,y)=>{
   const width=ctx.measureText(String(value)).width;
   assert.ok(x-width/2>=R.x+8&&x+width/2<=R.x+R.w-8,`${locale} ${index}: text width`);
   assert.ok(y>=R.y+12&&y<=R.y+R.h-12,`${locale} ${index}: text height`);rawText(value,x,y);
  };
  c.rect=()=>assert.fail('Echo must not paint an independent panel');w.drawEchoMemory();c.text=rawText;c.rect=rawRect;
  // The opaque client holds a dark surface all the way to its lower edge.
  const black=ctx.getImageData(R.x+6,640-(R.y+6),1,1).data;assert.deepEqual([...black],[3,7,13,255]);
  fs.writeFileSync(path.join(out,`${locale}-echo-${index}.png`),canvas.toBuffer('image/png'));
 }
}
console.log('24 actual Codea Canvas frames PASS: native font bounds, opaque client, no external Echo panel.');
