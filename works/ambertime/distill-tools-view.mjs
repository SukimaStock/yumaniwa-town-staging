// Presentation only. The native model owns every litre and collection boundary.
import {PARAMETERS} from './parameters.mjs';
export const RECEIVER_MAX_LITRES=PARAMETERS.baseLitres+PARAMETERS.extraLitres;
export const TOOL_GEOMETRY=Object.freeze({spoutX:192,glassY:345,collectX:174,waitX:237,travel:63,lever:{x:285,y:279,w:60,h:66},glass:{w:54,h:54}});
export function leverGuideOffset({now=0,completedRuns=0,enabled=false,touching=false,reduced=false}={}){
 if(!enabled||touching||reduced||completedRuns>=3)return 0;
 const practice=completedRuns>0,period=practice?2400:1500,step=Math.floor((Math.max(0,now)%period)/120),maximum=practice?2:3;
 return step<=maximum?step*3:0;
}
export function leverReturnStep(elapsed,reduced=false){return reduced||elapsed>=120?0:elapsed<60?2:1;}
export function distillToolsView({phase,collection={},litres=0,flowLitres=litres,available=false,canStart=false,prepared=false,countdown=false,automatic=false,completedRuns=0}){
 const expired=collection.expired===true,collecting=phase==='distilling'&&collection.collected&&(!collection.enabled||collection.start===null||collection.current>=collection.start),done=phase==='filling';
 const leverEnabled=available&&!automatic&&!countdown&&(phase==='ready'&&canStart&&prepared||expired);
 const collectingAllowed=collecting?collection.canStop:collection.canStart;
 const glassEnabled=available&&!automatic&&!countdown&&phase==='distilling'&&!expired&&!!collectingAllowed;
 const amount=done||collecting?Math.max(0,Number.isFinite(litres)?litres:0):0;
 // Symbolic receiver: no litres, independent of production quantity. A legal
 // completed cut is >=12 steps; its short eight-step fill has already settled.
 const end=done?collection.end??collection.current:collection.current,start=collection.start;
 const width=start===null||start===undefined?null:Math.max(0,(end-start)*(collection.fullRange?99:69));
 const fill=done?(width===null?.7:Math.min(.7,width/8*.7)):collecting?(width===null?.7:Math.min(.7,width/8*.7)):0;
 const showLeverArrow=completedRuns<3&&(phase==='ready'&&!countdown||expired);
 return {visible:available,leverEnabled,glassEnabled,glassMode:glassEnabled?(collecting?'stop':'start'):null,leverDown:countdown||!expired&&phase==='distilling',glassPosition:collecting?0:1,prepared,leverInactive:phase==='ready'&&!countdown&&!leverEnabled,showLeverArrow,guideLevel:completedRuns===0?'first':completedRuns<3?'practice':'learned',guideDistance:completedRuns===0?9:completedRuns<3?6:0,glassArrow:available&&!automatic&&(countdown||phase==='distilling'&&!expired),glassArrowActive:glassEnabled,litres:amount,fill,hint:phase==='ready'||expired?'レバーを下に引く':phase==='distilling'&&!automatic?(!collectingAllowed?'もう少し待ちます':collecting?'タップか右へスライドで終える':'タップか左へスライドで受ける'):'',arrow:leverEnabled&&showLeverArrow};
}
// All authored cells are 3 logical pixels, on the same grid as the apparatus.
export function drawDistillTools(ctx,view,{leverStep=null,glassX=TOOL_GEOMETRY.waitX,arrowBright=true,arrowOffset=0}={}){
 const r=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x/3),Math.round(y/3),Math.round(w/3),Math.round(h/3));},metal=view.leverInactive?'#555762':'#858995',light=view.leverInactive?'#777982':'#d8d5df',dark='#41414b',cream='#f0e6c8';
 r(297,300,6,33,dark);r(297,300,3,33,metal);
 const step=leverStep??(view.leverDown?2:0);
 // Three independent pixel poses; no rotated or filtered sprite.
 for(let n=0;n<9;n++){const dy=step===0?-Math.round(n*.75):step===2?Math.round(n*.75):0;r(300+n*3,315+dy*3,3,6,metal);r(300+n*3,315+dy*3,3,3,light);}
 const hy=step===0?294:step===2?330:312;r(321,hy,12,9,dark);r(321,hy,9,6,view.leverInactive?'#74736d':'#c8b77e');r(321,hy,6,3,view.leverInactive?'#858575':cream);
 r(294,306,12,3,metal);r(291,309,18,12,metal);r(294,321,12,3,dark);r(294,309,6,3,light);r(297,312,6,6,dark);r(300,315,3,3,light);
 if(view.showLeverArrow){const color=view.arrow?'#d8c990':'#62636b',offset=Math.round(arrowOffset/3)*3;r(324,261+offset,3,12,color);for(let n=0;n<3;n++)r(318+n*3,270+n*3+offset,15-n*6,3,color);}
 const x=Math.round(glassX/3)*3,y=TOOL_GEOMETRY.glassY,edge='#b9c0aa';
 if(view.glassArrow){const color=view.glassArrowActive?(arrowBright?'#d8c990':'#9f987c'):'#62636b';if(view.glassPosition===0){r(x+39,y+12,15,3,color);r(x+57,y+12,3,3,color);r(x+54,y+9,3,9,color);r(x+51,y+6,3,15,color);}else{r(x+45,y+12,15,3,color);r(x+39,y+12,3,3,color);r(x+42,y+9,3,9,color);r(x+45,y+6,3,15,color);}}
 if(view.fill>0){const h=Math.max(1,Math.round(8*view.fill))*3;r(x+6,y+27-h,24,h,'#b8aa7c');r(x+6,y+27-h,24,3,'#e7ddb6');}
 r(x,y,36,3,edge);r(x,y+3,3,24,edge);r(x+33,y+3,3,24,edge);r(x+3,y+27,3,3,edge);r(x+30,y+27,3,3,edge);r(x+6,y+30,24,3,edge);r(x+6,y+6,3,9,'#d4d7bf');
}
