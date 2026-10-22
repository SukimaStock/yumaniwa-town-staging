import {STAGES,clampStage,zoomTarget,renderMap} from './map.mjs';
const canvas=document.getElementById('map'),ctx=canvas.getContext('2d',{alpha:false});
const plus=document.getElementById('plus'),minus=document.getElementById('minus'),label=document.getElementById('stage');
let stage=1;
function change(next){stage=clampStage(next);renderMap(ctx,stage);label.textContent=`${stage} / 6　${STAGES[stage-1]}`;plus.disabled=stage===6;minus.disabled=stage===1;canvas.setAttribute('aria-label',`${STAGES[stage-1]}の縮尺のドット絵地図`)}
plus.addEventListener('click',()=>change(zoomTarget(stage,'out')));
minus.addEventListener('click',()=>change(zoomTarget(stage,'in')));
change(stage);
