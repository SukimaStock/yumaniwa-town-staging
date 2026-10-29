import {generateScene,validateScene,PALETTES,normalizeSettings} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
import {downloadBlob,svgBlob,pngBlob} from './exporter.mjs';
const $ = id => document.getElementById(id);
const paletteList = Array.isArray(PALETTES) ? PALETTES : Object.values(PALETTES);
for (const p of paletteList) { const option=document.createElement('option'); option.value=p.id; option.textContent=p.name; $('palette').append(option); }
let current, svg, gallery=[], galleryURLs=[], buildingGallery=false;
const status = message => { $('status').textContent=message; };
const settings = () => normalizeSettings({palette:$('palette').value,density:$('density').value,composition:$('composition').value});
const newSeed = () => Array.from(crypto.getRandomValues(new Uint32Array(2)),n=>n.toString(36)).join('-');
function readURL() {
  const query=new URLSearchParams(location.search);
  const config=normalizeSettings(Object.fromEntries(['palette','density','composition'].map(k=>[k,query.get(k)||'auto'])));
  for(const key of ['palette','density','composition']) $(key).value=config[key];
  return query.get('seed')?.slice(0,100)||'harbour-001';
}
function urlFor(seed,config){ const url=new URL(location.href); url.hash=''; url.search=''; for(const [k,v] of Object.entries({seed,...config,v:'0.1'})) url.searchParams.set(k,v); return url; }
function show(seed,config=settings(),push=true){
  try{
    const start=performance.now(); const scene=generateScene(seed,config), check=validateScene(scene);
    if(check.errors.length) throw new Error('構図の検査に失敗しました: '+check.errors.join(', '));
    const output=renderSVG(scene); $('art').innerHTML=output; current=scene; svg=output; $('seed').value=scene.seed;
    for(const key of ['palette','density','composition']) $(key).value=scene.settings[key];
    if(push) history.pushState(null,'',urlFor(scene.seed,scene.settings));
    const buildingCount=scene.blocks.reduce((n,b)=>n+b.buildings.length,0);
    $('record').textContent=`${scene.palette.name} / ${scene.composition} / ${buildingCount}棟 / ${Math.round(performance.now()-start)}ms / engine 0.1`;
    for(const button of $('gallery').children) button.setAttribute('aria-pressed',String(button.dataset.seed===scene.seed));
    status(check.warnings.length?'構図の注意: '+check.warnings.join(' / '):'');
  } catch(error){status(error.message);}
}
$('generate').addEventListener('click',()=>show(newSeed()));
$('seed-form').addEventListener('submit',event=>{event.preventDefault();show($('seed').value.trim()||'harbour-001');});
for(const key of ['palette','density','composition']) $(key).addEventListener('change',()=>show(current.seed));
window.addEventListener('popstate',()=>show(readURL(),settings(),false));
$('svg').addEventListener('click',()=>{downloadBlob(svgBlob(svg),filename('svg'));status('SVGを書き出しました。');});
function filename(extension){return 'postcard-'+current.seed.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)+'.'+extension;}
$('png').addEventListener('click',async()=>{ const exportSVG=svg, exportFilename=filename('png'); $('png').disabled=true;status('PNGを作成中…');try{downloadBlob(await pngBlob(exportSVG),exportFilename);status('PNGを書き出しました（1600 × 2000）。');}catch(error){status(error.message);}finally{$('png').disabled=false;}});
$('settings-save').addEventListener('click',()=>{downloadBlob(new Blob([JSON.stringify({engine:'0.1',seed:current.seed,...current.settings},null,2)],{type:'application/json'}),filename('json'));status('設定を書き出しました。再現には同じバージョンのエンジンを使います。');});
$('share').addEventListener('click',async()=>{const url=urlFor(current.seed,current.settings).href;try{await navigator.clipboard.writeText(url);status('URLをコピーしました。');}catch{status('URL: '+url);}});
async function compare(){
  if(buildingGallery)return;buildingGallery=true;$('compare').disabled=true;status('36枚を生成中…');
  const config=settings();const next=[];const urls=[];const fragment=document.createDocumentFragment();
  try{
    for(let i=0;i<36;i++){
      const seed='harbour-'+String(i+1).padStart(3,'0'), scene=generateScene(seed,config), output=renderSVG(scene);
      const url=URL.createObjectURL(svgBlob(output));urls.push(url);
      const button=document.createElement('button');button.className='thumb';button.dataset.seed=seed;button.setAttribute('aria-label',seed+' を表示');button.setAttribute('aria-pressed',String(seed===current.seed));
      const img=document.createElement('img');img.src=url;img.alt='';img.width=160;img.height=200;img.loading='lazy';
      const label=document.createElement('span');label.textContent=seed;button.append(img,label);button.addEventListener('click',()=>{show(seed,config);$('art').scrollIntoView({block:'start',behavior:'instant'});});fragment.append(button);next.push({seed,settings:scene.settings});
      if(i%6===5)await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    $('gallery').replaceChildren(fragment);galleryURLs.forEach(url=>URL.revokeObjectURL(url));galleryURLs=urls;gallery=next;status('36枚を生成しました。');
  }catch(error){urls.forEach(url=>URL.revokeObjectURL(url));status(error.message);}finally{buildingGallery=false;$('compare').disabled=false;}
}
$('compare').addEventListener('click',compare);
window.addEventListener('pagehide',()=>{galleryURLs.forEach(url=>URL.revokeObjectURL(url));galleryURLs=[];});
window.addEventListener('pageshow',event=>{if(event.persisted&&gallery.length)compare();});
show(readURL(),settings(),false);
