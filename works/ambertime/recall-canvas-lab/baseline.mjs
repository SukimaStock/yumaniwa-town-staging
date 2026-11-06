// Isolated host for the unchanged main player and its four stylesheets.
// No main application, restore, collector, model operation, or storage API.
import {EDITION} from './fixtures.mjs';
import {createRecallDebugPreview} from '../recall/debug-scene.mjs';
import {playbackScenes} from '../recall/live-scene.mjs';
import {installUniformTypography} from '../font-uniform.mjs';
import {fontReady} from '../font-loader.mjs';
const typography=installUniformTypography('',document.documentElement);
const resize=()=>typography.resize({scale:Math.min(innerWidth/360,innerHeight/640),dpr:Math.max(1,Math.min(3,devicePixelRatio||1))});
resize();window.addEventListener('resize',resize);
await fontReady;
const query=new URLSearchParams(location.search),mode=query.get('mode')==='handover'?'handover':'history';
const raw=Number(query.get('start')),start=Number.isInteger(raw)?Math.max(0,Math.min(EDITION.scenes.length-1,raw)):0;
let completed=false;
const player=createRecallDebugPreview({document,window});
player.open({scenes:playbackScenes(EDITION),mode,title:'二代目の回想',onComplete:()=>{completed=true;}});
const dialog=document.querySelector('.at-recall-debug');
dialog.addEventListener('close',()=>{if(parent!==window)parent.postMessage({type:'h4-baseline-close',completed},location.origin);});
const next=dialog.querySelector('.at-recall-controls [data-recall-action="next"]');
for(let i=0;i<start;i++)next.click();
