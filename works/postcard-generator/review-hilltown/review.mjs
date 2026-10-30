import {generateScene,validateScene} from '../engine.mjs?v=0.2.17';
import {renderSVG} from '../renderer.mjs?v=0.2.17';
import {cases} from './cases.mjs?v=0.2.17';
const cards=document.getElementById('cards'),urls=[];
try{for(const {seed,settings}of cases){
 const scene=generateScene(seed,settings),errors=validateScene(scene).errors;if(errors.length)throw new Error(seed+': '+errors.join(', '));
 const figure=document.createElement('figure'),a=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
 const query=new URLSearchParams({seed,...scene.settings,v:scene.version});query.delete('version');a.href='../?'+query;
 const url=URL.createObjectURL(new Blob([renderSVG(scene)],{type:'image/svg+xml'}));urls.push(url);img.src=url;img.alt=seed+' 丘に重なる町';img.width=160;img.height=200;img.loading='lazy';
 caption.textContent=`${seed} / ${settings.palette} / ${settings.density} / ${settings.colorMode}`;a.append(img);figure.append(a,caption);cards.append(figure);
}document.getElementById('status').textContent='36枚を生成しました。';}catch(error){document.getElementById('status').textContent=error.message;}
window.addEventListener('unload',()=>urls.forEach(url=>URL.revokeObjectURL(url)));
