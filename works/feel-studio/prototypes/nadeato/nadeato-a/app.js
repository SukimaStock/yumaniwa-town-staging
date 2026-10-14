/* Native input and rendering stay owned by the work. Bridge is optional. */
(function(root){'use strict';
const {Material,W,H}=root.NadeatoModel,{validate,defaults,elements}=root.NadeatoParameters;
const canvas=document.querySelector('#fur'),reset=document.querySelector('#reset');
const material=new Material(defaults),renderer=new root.NadeatoRenderer.Renderer(canvas,material);
const clone=x=>JSON.parse(JSON.stringify(x));
let pointer=null,viewport=null,paused=false,editing=false,last=0,bridge;
function release(flush=false){
 const old=pointer;pointer=null;viewport=null;if(flush)material.endStroke();else material.cancelStroke();
 if(old!==null){try{if(!canvas.hasPointerCapture||canvas.hasPointerCapture(old))canvas.releasePointerCapture(old);}catch(_){}}
}
function point(e){const r=viewport||canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function restoreState(value){const next=validate(value);release();material.applyState(next);material.reset();last=0;}
function applyState(value){material.applyState(value);}
function loop(t){const elapsed=last?(t-last)/1000:0,dt=Number.isFinite(elapsed)?Math.max(0,elapsed):0;last=t;if(!paused)material.step(dt);renderer.draw();root.requestAnimationFrame(loop);}
canvas.addEventListener('pointerdown',e=>{
 if(pointer!==null||paused||(e.pointerType==='mouse'&&e.button!==0))return;
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;viewport={left:r.left,top:r.top,width:r.width,height:r.height};
 material.beginStroke(point(e),viewport);pointer=e.pointerId;try{canvas.setPointerCapture(pointer);}catch(_){}e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerId!==pointer||paused)return;const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])material.moveStroke(point(sample));e.preventDefault();
});
canvas.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;material.moveStroke(point(e));release(true);});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===pointer)release();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('keydown',e=>{
 if(paused)return;const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},dir=directions[e.key];if(!dir)return;e.preventDefault();release();const r=canvas.getBoundingClientRect();material.stroke({x:W/2-dir[0]*90,y:H/2-dir[1]*90},{x:W/2+dir[0]*90,y:H/2+dir[1]*90},{width:r.width,height:r.height});
});
reset.addEventListener('click',()=>restoreState(material.config));
root.addEventListener('blur',()=>release());
root.addEventListener('resize',()=>release());
document.addEventListener('visibilitychange',()=>{if(document.hidden)release();if(!bridge?.isConnected())paused=document.hidden;last=0;});
new root.ResizeObserver(()=>{release();const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,root.devicePixelRatio||1);}).observe(canvas);
const scenes=[
 {id:'clean',label:'何もなでていない面',contract:'nadeato-clean/1',description:'毛並みを初期方向に戻して触り比べる',configDrivenKeys:[]},
 {id:'fixedstroke',label:'中央を一度なでた面',contract:'nadeato-fixedstroke/1',description:'基準面の中央を左から右へ一度なで、向きを落ち着かせる',configDrivenKeys:['resistance','fingerWidth']}
];
function startTestScene(input){
 const scene=input&&scenes.find(s=>s.id===input.sceneId&&s.contract===input.contract);
 if(!scene||typeof input.runId!=='string'||!/^[a-zA-Z0-9_-]{1,90}$/.test(input.runId))throw Error('テスト場面の指定が不正です');
 const next=validate(input.config);release();material.applyState(next);material.prepareScene(scene.id);last=0;
 const effectiveConditions={seed:137,materialWidth:W,materialHeight:H,input:'free',response:'settled'};
 if(scene.id==='fixedstroke')Object.assign(effectiveConditions,{stroke:'horizontal-center',strokeStartX:150,strokeStartY:280,strokeEndX:490,strokeEndY:280,referenceWidth:W,referenceHeight:H,resistance:material.config.resistance,fingerWidth:material.config.fingerWidth});
 return{runId:input.runId,sceneId:scene.id,contract:scene.contract,effectiveConditions,config:clone(material.config)};
}
bridge=root.FeelBridge?.connect({
 play(){paused=false;last=0;},pause(value){paused=!!value;release();last=0;},reset(){restoreState(material.config);},
 getState(){return clone(material.config);},restoreState,applyState,
 getEditableElements(){return elements(material.config);},
 beginEdit(id){if(id===null)editing=true;},endEdit(id){if(id===null)editing=false;},
 applyEdit(id,change){if(!elements(material.config).some(e=>e.id===id))throw Error('編集対象がありません');applyState({...material.config,[id]:change.value});},
 getTestScenes(){return clone(scenes);},startTestScene,
 getComparisonInfo(){return '同じ毛並みから、指でなでて比べます。LIVEではなで跡を保持します。中央の一なでは640×560の基準面から準備し、指の幅・抵抗の差を確かめます。自由操作の指幅はCSS pxです。';}
});
const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,root.devicePixelRatio||1);root.requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:globalThis);
