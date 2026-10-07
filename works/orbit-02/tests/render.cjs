'use strict';
// Optional offscreen Canvas QA using the exact copied Codea adapter, not browser evidence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const {load,home,root}=require('./harness.cjs');
const out=path.resolve(process.argv[2]||'/tmp/orbit-02-render');fs.mkdirSync(out,{recursive:true});
for(const locale of ['ja','en']){
 const a=load({locale}),{context:c,world:w}=a;
 vm.runInContext(fs.readFileSync(path.join(root,'codea-lite.js'),'utf8'),c);
 Object.assign(c,c.window);
 const canvas=createCanvas(360,640),ctx=canvas.getContext('2d');
 const state=c.CodeaLite.state;state.canvas=canvas;state.ctx=ctx;state.width=360;state.height=640;
 home(w);w.ship.pos={x:0,y:-160};w.camera={x:0,y:-160};w.base.level=5;
 w.echoes.found=7;for(let i=1;i<=7;i++){w.echoes.discovered.add('fixture-'+i);w.echoes.read.add(i)}
 w.echoes.interpreted=new Set([2,7]);w.echoes.returnWaitLinked=true;
 for(const view of ['browse','archive-0','archive-1','archive-2','memory','analysis','deposit','invite']){
  w.homeTerminal.mode=view==='browse'?'browse':'archive';w.homeTerminal.archivePage=view.endsWith('1')?1:view.endsWith('2')?2:0;
  w.homeTerminal.depositIndex=2;w.homeTerminal.depositTimer=view==='deposit'?0.5:0;w.homeTerminal.resonanceTarget=view==='invite'?7:0;
  w.echoStory.analyzing=view==='analysis';w.echoStory.analysisDuration=2.4;w.echoStory.analysisTimer=view==='analysis'?1.5:0;
  w.echoStory.active=view==='memory';w.echoStory.index=2;w.echoStory.timer=3;
  ctx.setTransform(1,0,0,-1,0,640);
  w.draw();
  fs.writeFileSync(path.join(out,`${locale}-${view}.png`),canvas.toBuffer('image/png'));
 }
}
console.log('Rendered 16 offscreen frames with copied Codea Lite (360×640; not browser/Safari verification).');
