import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as tools from '../distill-tools-view.mjs';
import * as layout from '../canvas-layout.mjs';
import {DistillToolInput} from '../distill-tool-input.mjs';

// The pre-R2 implementation is the oracle, never regenerated from the candidate.
const BASE='1a86a3ce40eb5b5abadda162451d777a649ee855';
const hashes={
 'distill-tools-view.mjs':'15e0d1f075d823e2c563cec1d7c218bd376d5c1837aa027a1496a849debf1ce8',
 'distill-tool-input.mjs':'03c48fe15fa28437ba71e759222e90fd416f35ce6ba45eba487cecc9ebab644c',
 'canvas-layout.mjs':'f2aa4cf25885827b0b438f5345294feb71302909a82bfe884c118097f00da590',
 'canvas-scene.mjs':'67bdbc0f2c0c581ea2ef2f8c8c5ff929adfaeca7d86bf6a6bed0bc64651d2a40'
};
const previous=Object.fromEntries(Object.entries(hashes).map(([file,hash])=>{
 const source=execFileSync('git',['show',BASE+':works/ambertime/'+file],{encoding:'utf8',maxBuffer:4e6});
 assert.equal(createHash('sha256').update(source).digest('hex'),hash,'immutable R1 source: '+file);
 return [file,source];
}));
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function moduleHost(source,names,ports={}){
 return vm.runInNewContext(source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n({'+names.join(',')+'});',ports);
}
const oldTools=moduleHost(previous['distill-tools-view.mjs'],['TOOL_GEOMETRY','drawDistillTools','leverGuideOffset','leverReturnStep'],{PARAMETERS:{baseLitres:32,extraLitres:8}});
const oldLayout=moduleHost(previous['canvas-layout.mjs'],['layoutScene','computeViewport','projectRect','toLogical','hitTest']);
const OldInput=moduleHost(previous['distill-tool-input.mjs'],['DistillToolInput']).DistillToolInput;
const paint=(draw,view,options)=>{const trace=[],ctx={fillRect:(...rect)=>trace.push([ctx.fillStyle,...rect])};draw(ctx,view,options);return plain(trace);};

test('R2 all three pixel poses, glass endpoints/intermediate motion, liquid and guide cells exactly match R1',()=>{
 for(const leverStep of [null,0,1,2])for(const leverDown of [false,true])for(const leverInactive of [false,true])
 for(const glassX of [174,174.49,175.5,189.75,205.5,236.9,237])for(const glassPosition of [0,1])
 for(const arrowOffset of [0,3,6,9])for(const arrowBright of [false,true]){
  const view={leverDown,leverInactive,glassPosition,showLeverArrow:true,arrow:!leverInactive,glassArrow:true,glassArrowBlink:true,fill:.43};
  const options={leverStep,glassX,arrowOffset,arrowBright};
  assert.deepEqual(paint(tools.drawDistillTools,view,options),paint(oldTools.drawDistillTools,view,options));
 }
 for(const fill of [0,.001,.125,.5,1])for(const view of [{fill},{fill,liquidColor:'#123456',liquidHighlight:'#abcdef',glassArrow:true,glassArrowActive:false}])
  assert.deepEqual(paint(tools.drawDistillTools,view,{}),paint(oldTools.drawDistillTools,view,{}));
 assert.equal(tools.TOOL_GEOMETRY.collectX+18,tools.TOOL_GEOMETRY.spoutX);
 assert.equal(tools.TOOL_GEOMETRY.waitX-tools.TOOL_GEOMETRY.collectX,tools.TOOL_GEOMETRY.travel);
 // The existing still SVG uses native cell34 at equipment origin90, on a3px grid.
 assert.equal(layout.layoutScene({room:'distill'}).equipment.x+34*3,tools.TOOL_GEOMETRY.spoutX);
});

test('R2 logical layout, strict endpoint selection, viewport offsets/DPR and hit boundaries exactly match R1',()=>{
 const views=[{},...['distill','warehouse','sales'].flatMap(room=>[0,1,false,true,null,undefined,2,'0'].map(glassPosition=>({room,tools:{glassPosition},brewing:true,casks:[{id:4},{id:7}],products:[{id:9}],feedback:{text:'反応'},staffAvailable:true,mapAvailable:true})))];
 for(const view of views){
  const actual=layout.layoutScene(view),expected=oldLayout.layoutScene(view);assert.deepEqual(plain(actual),plain(expected));
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740],[320,450],[600,400]])for(const dpr of [.75,1,2,3,4]){
   const input={width,height,dpr,left:13,top:27},v=layout.computeViewport(input),oldV=oldLayout.computeViewport(input);
   assert.deepEqual(plain(v),plain(oldV));
   for(const r of actual.controls.filter(r=>r.key.startsWith('distill-'))){
    assert.deepEqual(plain(layout.projectRect(v,r)),plain(oldLayout.projectRect(oldV,r)));
    for(const [x,y] of [[r.x,r.y],[r.x+r.w,r.y+r.h],[r.x-.01,r.y],[r.x+r.w+.01,r.y]])
     assert.deepEqual(plain(layout.hitTest(actual.controls,x,y)),plain(oldLayout.hitTest(expected.controls,x,y)));
    const css=layout.projectRect(v,r),p={x:css.x+v.left,y:css.y+v.top};
    assert.deepEqual(plain(layout.toLogical(v,p.x,p.y)),plain(oldLayout.toLogical(oldV,p.x,p.y)));
   }
  }
 }
});

class Target{
 constructor(log,name){this.log=log;this.name=name;this.listeners=new Map();this.capture=new Set();}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 setPointerCapture(id){this.log.push(['capture',this.name,id]);this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){this.log.push(['release',this.name,id]);this.capture.delete(id);this.fire('lostpointercapture',{pointerId:id});}
 fire(type,values={}){const e={pointerId:1,isPrimary:true,button:0,clientX:100,clientY:100,detail:1,preventDefault:()=>this.log.push(['prevent',this.name,type]),stopPropagation:()=>this.log.push(['stop',this.name,type]),...values};for(const fn of [...(this.listeners.get(type)??[])])fn(e);}
}
function inputTrace(Input,{kind='lever',mode='start',travel=63,moves=[],end={},interrupt=null,keys=null}={}){
 const log=[],root=new Target(log,'root'),lever=new Target(log,'lever'),glass=new Target(log,'glass'),doc=new Target(log,'doc'),win=new Target(log,'win');win.visualViewport=new Target(log,'vv');doc.defaultView=win;root.ownerDocument=doc;
 let view={visible:true,leverEnabled:kind==='lever',leverDown:kind!=='lever',glassEnabled:kind==='glass',glassMode:kind==='glass'?mode:null,glassPosition:mode==='start'?1:0,glassTravel:travel};
 const ui=new Input({root,lever,glass,read:()=>view,onAction:k=>log.push(['action',k]),onChange:change=>log.push(['change',plain(change)])}),node=kind==='lever'?lever:glass;
 if(keys){for(const [key,extra] of keys)node.fire('keydown',{key,...extra});}
 else{
  node.fire('pointerdown');for(const move of moves)node.fire('pointermove',move);
  if(interrupt==='pointercancel'||interrupt==='lostpointercapture')node.fire(interrupt);
  else if(interrupt==='second')root.fire('pointerdown',{pointerId:2,isPrimary:false});
  else if(interrupt==='hidden'){doc.hidden=true;doc.fire('visibilitychange');}
  else if(interrupt==='pagehide'||interrupt==='resize')win.fire(interrupt);
  else if(interrupt==='vvresize'||interrupt==='vvscroll')win.visualViewport.fire(interrupt.slice(2));
  else if(interrupt==='state'){view={...view,visible:false};ui.update(view);}
  node.fire('pointerup',end);node.fire('click');node.fire('pointerup',end);
 }
 log.push(['final',ui.gesture===null,ui.keyboardStep,[...lever.capture],[...glass.capture]]);ui.destroy();return plain(log);
}
const compareInput=options=>{const actual=inputTrace(DistillToolInput,options);assert.deepEqual(actual,inputTrace(OldInput,options),JSON.stringify(options));return actual;};
test('R2 lever18/36 are CSS pixels at every scale: pose, downward dominance and release boundaries match R1',()=>{
 for(const scale of [.5,.8875,.96875,1,1.0625,1.5])for(const dy of [-70,0,17.999,18,18.001,35.999,36,36.001,1000])for(const dx of [0,35.999,36,36.001,80]){
  const result=compareInput({travel:63*scale,moves:[{clientX:100+dx,clientY:100+dy}],end:{clientX:100+dx,clientY:100+dy}});
  assert.equal(result.filter(x=>x[0]==='action').length,dy>=36&&dy>Math.abs(dx)?1:0);
 }
 const phases=compareInput({moves:[{clientY:117.999},{clientY:118},{clientY:135.999},{clientY:136}],end:{clientY:136}}).filter(x=>x[0]==='change').map(x=>x[1].leverStep);
 assert.deepEqual(phases,[0,0,1,1,2,2,null]);
});

test('R2 glass CSS travel clamp, sticky8px drag and directional commit thresholds match R1',()=>{
 for(const mode of ['start','stop'])for(const travel of [undefined,null,0,-1,NaN,30,63*.8875,63,80]){
  const validTravel=Number.isFinite(travel)&&travel>0?travel:63,sign=mode==='start'?-1:1,boundary=Math.min(24,validTravel*.45);
  for(const dx of [0,7.999,8,8.001,15,boundary-.001,boundary,boundary+.001,63,1000,-30])for(const dy of [0,dx,dx+.001])
   compareInput({kind:'glass',mode,travel,moves:[{clientX:100+sign*dx,clientY:100+dy}],end:{clientX:100+sign*dx,clientY:100+dy}});
  compareInput({kind:'glass',mode,travel,moves:[{clientX:100+sign*30}],end:{clientX:100+sign}});
 }
});

test('R2 cancel, capture, multitouch, lifecycle and keyboard action traces match R1',()=>{
 for(const kind of ['lever','glass'])for(const interrupt of ['pointercancel','lostpointercapture','second','hidden','pagehide','resize','vvresize','vvscroll','state']){
  const result=compareInput({kind,moves:[kind==='lever'?{clientY:160}:{clientX:40}],end:kind==='lever'?{clientY:160}:{clientX:40},interrupt});
  assert.equal(result.filter(x=>x[0]==='action').length,0);
 }
 for(const keys of [[['ArrowDown'],['Enter']],[['ArrowDown'],['ArrowDown'],['Enter']],[['ArrowDown'],['ArrowDown',{repeat:true}],['Enter']],[['ArrowDown'],['ArrowUp'],['Enter']],[['ArrowDown'],['ArrowDown'],['Escape'],['Enter']]])compareInput({keys});
});

function animation(source,ports,options){
 const start=source.indexOf('  this.toolGuideMoving=false;this.toolReturning=false;const tools='),end=source.indexOf('  this.controls();this.drawWorld();',start);assert(start>=0&&end>start);
 const ctx={...ports,now:options.now,visible:options.visible??true,scene:{sampleDistillCompletion:()=>null,view:{room:options.room??'distill',tools:{glassPosition:options.position??1,visible:true,arrow:true,guideLevel:'first',...options.tools}},viewport:{scale:options.scale??1},reducedMotion:{matches:options.reduced??false},toolSlide:options.slide?{...options.slide}:null,toolReturn:options.returning?{...options.returning}:null,toolGesture:options.gesture??null,toolGuideSince:0}};
 vm.runInNewContext('(function(){'+source.slice(start,end)+'}).call(scene);',ctx);return plain(ctx.scene);
}
function transitionTrace(source,ports,layoutScene,position,paintX){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 const Scene=moduleHost(source,['CanvasScene'],{...ports,layoutScene,document:{getElementById:node},performance:{now:()=>500}}).CanvasScene;
 const scene=Object.create(Scene.prototype),log=[];
 Object.assign(scene,{root:{dataset:{},setAttribute:(k,v)=>log.push(['attribute',k,v])},motion:{observe:ids=>log.push(['motion',ids])},queue:()=>log.push(['queue']),toolPaintX:paintX,toolGesture:{leverStep:1,glassOffset:-20},view:{room:'distill',tools:{glassPosition:position,visible:true,leverDown:true},phase:'distilling'}});
 scene.setToolGesture({leverStep:null,glassOffset:null});
 const released=plain({slide:scene.toolSlide,guide:scene.toolGuideSince});
 scene.update({room:'distill',phase:'filling',tools:{glassPosition:position?0:1,visible:true,leverDown:false},motionIds:{},calendar:'一年目',cash:'100G',generation:'初代',timeStatus:'停止',phaseSummary:'樽詰め待ち',monthProgress:.25});
 return plain({released,slide:scene.toolSlide,returning:scene.toolReturn,guide:scene.toolGuideSince,layout:scene.layout,root:scene.root.dataset,nodes:[...nodes],log});
}
test('R2 actual Canvas gesture release and endpoint-change animation fallbacks match R1',()=>{
 for(const position of [0,1,false,true,null,2,'0'])for(const paintX of [undefined,null,0,189.75,237])
  assert.deepEqual(transitionTrace(read('canvas-scene.mjs'),tools,layout.layoutScene,position,paintX),transitionTrace(previous['canvas-scene.mjs'],oldTools,oldLayout.layoutScene,position,paintX));
});
test('R2 actual Canvas animation branch preserves140ms interpolation, CSS-to-logical drag, return and guide',()=>{
 for(const position of [0,1,false,true,null,2,'0'])for(const scale of [.5,.8875,1,1.0625,1.5])for(const now of [0,59,60,70,119,120,139.999,140,360,900])for(const reduced of [false,true]){
  for(const extras of [{},{slide:{from:237,to:174,start:0}},{gesture:{leverStep:1,glassOffset:-31.5}},{returning:{start:0}},{visible:false}]){
   const options={position,scale,now,reduced,...extras};
   assert.deepEqual(animation(read('canvas-scene.mjs'),tools,options),animation(previous['canvas-scene.mjs'],oldTools,options));
  }
 }
});
