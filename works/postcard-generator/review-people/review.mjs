import {generateScene,validateScene} from '../engine.mjs?v=0.2.22';
import {renderSVG as renderBefore} from './before.mjs?v=0.2.22';
import {renderSVG} from '../renderer.mjs?v=0.2.22';
import {cases,modes} from './cases.mjs?v=0.2.22';
const cards=document.getElementById('cards'),urls=[],finishSelect=document.getElementById('review-finish'),requested=new URLSearchParams(location.search).get('finish'),finishOverride=['original','print','watercolor','print-material','watercolor-material'].includes(requested)?requested:'';finishSelect.value=finishOverride;finishSelect.addEventListener('change',()=>{const url=new URL(location.href);if(finishSelect.value)url.searchParams.set('finish',finishSelect.value);else url.searchParams.delete('finish');location.href=url;});
try{
 for(const {seed,settings} of cases){
  const section=document.createElement('section'),title=document.createElement('h2'),row=document.createElement('div');row.className='row';
  title.textContent=`${seed} / ${settings.scene} / ${settings.palette} / ${settings.density}`;
  for(const [mode,label] of modes){
   const scene=generateScene(seed,{...settings,...(finishOverride?{finish:finishOverride}:{})}),errors=validateScene(scene).errors;
   if(errors.length)throw new Error(`${seed}: ${errors.join(', ')}`);
   const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
   const query=new URLSearchParams({seed,...scene.settings,v:scene.version});query.delete('version');link.href='../?'+query;
   const url=URL.createObjectURL(new Blob([(mode==='before'?renderBefore:renderSVG)(scene)],{type:'image/svg+xml'}));urls.push(url);if(mode==='before'){link.href=url;link.target='_blank';link.rel='noopener';}
   img.src=url;img.alt=`${seed} ${label}`;img.width=160;img.height=200;img.loading='lazy';caption.textContent=label;
   link.append(img);figure.append(link,caption);row.append(figure);
  }
  section.append(title,row);cards.append(section);
 }
 document.getElementById('status').textContent=`${cases.length} seed・${cases.length*modes.length}枚を生成しました。`;
}catch(error){document.getElementById('status').textContent=error.message;}
window.addEventListener('unload',()=>urls.forEach(url=>URL.revokeObjectURL(url)));
