import {generateScene,validateScene} from '../engine.mjs?v=0.2.13';
import {renderSVG} from '../renderer.mjs?v=0.2.13';
import {cases,modes} from './cases.mjs?v=0.2.13';
const cards=document.getElementById('cards'),urls=[];
try{
 for(const {seed,settings} of cases){
  const section=document.createElement('section'),title=document.createElement('h2'),row=document.createElement('div');row.className='row';
  title.textContent=`${seed} / ${settings.palette} / ${settings.density} / ${settings.scene}`;
  for(const [reflection,label] of modes){
   const scene=generateScene(seed,{...settings,reflection}),errors=validateScene(scene).errors;
   if(errors.length)throw new Error(`${seed}: ${errors.join(', ')}`);
   const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
   const query=new URLSearchParams({seed,...scene.settings,v:scene.version});query.delete('version');link.href='../?'+query;
   const url=URL.createObjectURL(new Blob([renderSVG(scene)],{type:'image/svg+xml'}));urls.push(url);
   img.src=url;img.alt=`${seed} ${label}`;img.width=160;img.height=200;img.loading='lazy';caption.textContent=label;
   link.append(img);figure.append(link,caption);row.append(figure);
  }
  section.append(title,row);cards.append(section);
 }
 document.getElementById('status').textContent=`${cases.length} seed・${cases.length*modes.length}枚を生成しました。`;
}catch(error){document.getElementById('status').textContent=error.message;}
window.addEventListener('unload',()=>urls.forEach(url=>URL.revokeObjectURL(url)));
