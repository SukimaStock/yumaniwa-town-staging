import {EDITION,EXAMPLE_NAMES} from './fixtures.mjs';
import {sceneViews,drawScene,sceneDimensions} from './scene.mjs';
import {uniformMetrics} from '../font-uniform.mjs';
const $=id=>document.getElementById(id),dialog=$('player'),canvas=dialog.querySelector('canvas');
const views=sceneViews(EDITION),baselineHost=$('baseline-host'),baselineFrame=$('baseline-frame');
let baselineFocus=null;
let index=0,mode='history',returnFocus=null;
for(const [i,name] of EXAMPLE_NAMES.entries())$('example').add(new Option(name,String(i)));
function size(){
 const phoneWidth=Math.min(Number($('width').value),innerWidth);
 const typography=uniformMetrics({scale:Math.min(phoneWidth/360,innerHeight/640),dpr:Math.max(1,Math.min(3,devicePixelRatio||1))});
 dialog.style.fontSize=Math.max(16,typography.cssSize)+'px';
 const {width,height}=sceneDimensions(views[index]);
 const available=Math.max(1,$('picture').clientWidth),heightLimit=Math.max(height,innerHeight-260);
 const scale=Math.max(1,Math.floor(Math.min(available/width,heightLimit/height)));
 canvas.style.width=width*scale+'px';canvas.style.height=height*scale+'px';
}
function render(){
 const view=views[index],last=index===views.length-1;
 $('date').textContent=view.date;$('sentence').textContent=view.sentence;
 $('counter').textContent=`${index+1} / ${views.length}`;
 $('previous').disabled=index===0;$('picture').disabled=last;
 $('next').textContent=last?(mode==='handover'?'次の代へ':'閉じる'):'次へ';
 const dimensions=sceneDimensions(view);canvas.width=dimensions.width;canvas.height=dimensions.height;
 drawScene(canvas.getContext('2d'),view);size();
}
function close(){if(dialog.open)dialog.close();}
function next(){if(index<views.length-1){index++;render();}else{if(mode==='handover')$('result').textContent='サンプルの回想を終えました。世代交代の処理には接続していません。';close();}}
function previous(){if(index>0){index--;render();}}
$('proposed').addEventListener('click',()=>{
 returnFocus=document.activeElement;mode=$('mode').value;index=Number($('example').value);
 dialog.showModal();render();$('next').focus({preventScroll:true});
});
$('current').addEventListener('click',()=>{
 baselineFocus=document.activeElement;
 const query=new URLSearchParams({mode:$('mode').value,start:$('example').value});
 baselineFrame.src='./baseline.html?'+query;baselineHost.showModal();$('baseline-close').focus({preventScroll:true});
});
$('baseline-close').addEventListener('click',()=>baselineHost.close());
baselineHost.addEventListener('close',()=>{baselineFrame.src='about:blank';baselineFocus?.focus({preventScroll:true});baselineFocus=null;});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==baselineFrame.contentWindow||event.data?.type!=='h4-baseline-close')return;
 if(event.data.completed)$('result').textContent='サンプルの回想を終えました。世代交代の処理には接続していません。';
 if(baselineHost.open)baselineHost.close();
});
$('next').addEventListener('click',next);$('picture').addEventListener('click',next);$('previous').addEventListener('click',previous);$('close').addEventListener('click',close);
dialog.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true});returnFocus=null;});
dialog.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft'){event.preventDefault();previous();}if(event.key==='ArrowRight'){event.preventDefault();next();}});
$('width').addEventListener('change',()=>{document.documentElement.style.setProperty('--phone-width',$('width').value+'px');if(dialog.open)size();});
new ResizeObserver(()=>{if(dialog.open)size();}).observe(dialog);
window.addEventListener('resize',()=>{if(dialog.open)size();});
// No timer or animation: normal and reduced-motion both wait for the reader.
