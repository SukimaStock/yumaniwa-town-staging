import {createManipulationPanel} from './manipulation-debug.js?v=0.7.1';
import {FEEL_PROFILES,DEFAULT_FEEL} from './engine/response.js?v=0.7.1';
// UI only. The normal app calls this factory exclusively when ?debug is present.
export function createDebugPanel(body,input,host,readGlError=()=> '未使用') {
 const panel=document.createElement('details');panel.className='debug';panel.open=true;
 const summary=document.createElement('summary');summary.textContent='Touch parameters';panel.append(summary);
 const choice=document.createElement('select');choice.id='feel-profile';choice.setAttribute('aria-label','触感の比較');
 for(const name of Object.keys(FEEL_PROFILES)){
  const option=document.createElement('option');option.value=name;option.textContent=name+(name===DEFAULT_FEEL?' · 初期値':'');choice.append(option);
 }
 choice.value=body.feel;
 const feelLabel=document.createElement('label');feelLabel.textContent='触感の比較';feelLabel.append(choice);panel.append(feelLabel);
 const sliders=new Map();
 for(const [key,label,min,max,step] of [
  ['depth','押し込みの強さ',.08,.23,.005],['radius','伝わる範囲',.55,1.35,.01],
  ['pressRate','押し込みの速さ',3,16,.1],['restoreStiffness','復元速度 (押す・引く)',100,500,5],
  ['returnDamping','復元時の揺れ・減衰',.40,.98,.02],['tapImpulse','タップの反発',1.8,3.6,.1],
  ['holdDelay','長押し判定時間 (ms)',200,700,10],['pullStrength','引っ張りの強さ',.5,1.5,.05],
  ['maxPull','最大変形量',.2,.6,.01],['pullRadius','引っ張りの伝達範囲',1,1.9,.05],
  ['damping','回転の減衰',.6,5,.05],['settle','回転の小さな揺れ',0,.035,.001]]){
  const row=document.createElement('label'),slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=body.options[key];slider.setAttribute('aria-label',label);const value=document.createElement('span');value.textContent=` ${slider.value}`;row.textContent=label;row.append(value,slider);
  slider.addEventListener('input',()=>{input.cancel();body.cancel();body.options[key]=Number(slider.value);body.reboundDamping=body.options.returnDamping;value.textContent=` ${slider.value}`;});panel.append(row);sliders.set(key,{slider,value});
 }
 choice.addEventListener('change',()=>{input.cancel();body.setFeel(choice.value);for(const [key,{slider,value}] of sliders){slider.value=body.options[key];value.textContent=` ${slider.value}`;}});
 const output=document.createElement('output');output.id='feel-output';panel.append(output);host.append(panel);
 let last=-Infinity;
 const update=()=>{
  const now=performance.now();if(now-last<200)return;last=now;
  output.textContent=`${body.feel} · ${body.mesh.faces?.length??'—'} faces / ${body.mesh.triangles.length} triangles · DPR ${Math.min(2,devicePixelRatio)}\n${input.pointer?.mode??'idle'} · face ${body.pull?.face??body.pressure?.face??'—'} · speed ${Math.hypot(...body.velocity).toFixed(2)} · GL ${readGlError()}${body.shapeLimits?`\nshape cap · press ${body.shapeLimits.pressDepth} / pull ${body.shapeLimits.maxPull}`:''}`;
 };
 update();return {element:panel,update};
}

// One owner for all active debug panels; a supported specimen can have both
// authored Motion and user Manipulation on different rigid parts.
export function createDebugPanels(session,input,host,onChange,readGlError){
 const stack=document.createElement('div');stack.className='debug-stack';host.append(stack);
 const panels=[];
 if(session.body.touchEnabled)panels.push(createDebugPanel(session.body,input,stack,readGlError));
 if(session.motion){
  const panel=document.createElement('div'),output=document.createElement('output');panel.className='debug';panel.append(output);stack.append(panel);
  panels.push({update(){output.textContent=`MOTION ${session.motion.playing?'PLAY':'PAUSE'} / ${session.motion.time.toFixed(2)}s\n${session.motion.tracks.map(t=>`${t.part}: ${t.type}`).join('\n')}`;}});
 }
 if(session.manipulation)panels.push(createManipulationPanel(session.manipulation,input,stack,onChange));
 const update=()=>{for(const panel of panels)panel.update();};
 update();return {update};
}
