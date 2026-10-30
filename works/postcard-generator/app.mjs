import {VERSION,generateScene,validateScene,PALETTES,SCENES,normalizeSettings} from './engine.mjs?v=0.2.9';
import {renderSVG} from './renderer.mjs?v=0.2.9';
import {downloadBlob,svgBlob,pngBlob} from './exporter.mjs';
const $ = id => document.getElementById(id);
const keys=['scene','palette','density','composition','roofs','windows','colorMode','facade','sky','groundFloor','accents','corners','reflection','version'];
const sceneNames=Object.fromEntries(SCENES.map(s=>[s.id,s.name]));
const addOptions=(id,values)=>{for(const item of values){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;$(id).append(o);}};
addOptions('scene',SCENES);addOptions('palette',PALETTES);
let current, svg, activeConfig, gallery=[], galleryURLs=[], buildingGallery=false;
const status = message => { $('status').textContent=message; };
const settings = () => normalizeSettings(Object.fromEntries(keys.map(key=>[key,$(key).value])));
const newSeed = () => Array.from(crypto.getRandomValues(new Uint32Array(2)),n=>n.toString(36)).join('-');
function readURL() {
  const query=new URLSearchParams(location.search);
  const values=Object.fromEntries(keys.map(key=>[key,query.get(key)||'auto']));
  // Previously shared seed URLs predate ground-floor grammar.
  if(query.has('seed')&&!query.has('groundFloor'))values.groundFloor='plain';
  if(query.has('seed')&&!query.has('accents'))values.accents='plain';
  if(query.has('seed')&&!query.has('corners'))values.corners='plain';
  if(query.has('seed')&&!query.has('reflection'))values.reflection='plain';
  values.version=query.get('v')==='0.1'?'0.1':VERSION;
  const config=normalizeSettings(values);
  for(const key of keys) $(key).value=config[key] ?? (key==='version'?values.version:'auto');
  return {seed:query.get('seed')?.slice(0,100)||'harbour-001',config};
}
function urlFor(seed,config){
  const url=new URL(location.href);url.hash='';url.search='';
  for(const [k,v] of Object.entries({seed,...config})) if(k!=='version')url.searchParams.set(k,v);
  url.searchParams.set('v',config.version||VERSION);return url;
}
function reflect(config){
  for(const key of keys) $(key).value=config[key] ?? (key==='version'?VERSION:'auto');
  const legacy=config.version==='0.1';
  for(const key of ['scene','roofs','windows','colorMode','facade','sky','groundFloor','accents','corners']) $(key).disabled=legacy;
  $('reflection').disabled=legacy||current.mode!=='waterfront';
  $('composition').disabled=!legacy&&current.mode!=='waterfront';
  $('corners').disabled=legacy||!['closeup','street','square','alley'].includes(current.mode);
  for(const option of $('palette').options) option.disabled=legacy&&!['auto','harbor','apricot','garden'].includes(option.value);
}
function show(seed,config=settings(),push=true){
  try{
    const start=performance.now(),scene=generateScene(seed,config),check=validateScene(scene);
    if(check.errors.length) throw new Error('構図の検査に失敗しました: '+check.errors.join(', '));
    const output=renderSVG(scene);$('art').innerHTML=output;current=scene;svg=output;activeConfig={...config,version:scene.version};$('seed').value=scene.seed;reflect(activeConfig);
    if(push) history.pushState(null,'',urlFor(scene.seed,activeConfig));
    const count=scene.blocks.reduce((n,b)=>n+b.buildings.length,0);
    $('record').textContent=`${sceneNames[scene.mode]||'水辺'} / ${scene.palette.name} / ${count}棟 / ${Math.round(performance.now()-start)}ms / engine ${scene.version}`;
    for(const button of $('gallery').children) button.setAttribute('aria-pressed',String(button.dataset.key===cardKey(scene.seed,activeConfig)));
    status(check.warnings.length?'構図の注意: '+check.warnings.join(' / '):'');
  }catch(error){status(error.message);}
}
const cardKey=(seed,config)=>JSON.stringify([seed,config]);
$('generate').addEventListener('click',()=>show(newSeed()));
$('seed-form').addEventListener('submit',event=>{event.preventDefault();show($('seed').value.trim()||'harbour-001');});
for(const key of keys) $(key).addEventListener('change',()=>show(current.seed));
window.addEventListener('popstate',()=>{const {seed,config}=readURL();show(seed,config,false);});
$('svg').addEventListener('click',()=>{downloadBlob(svgBlob(svg),filename('svg'));status('SVGを書き出しました。');});
function filename(extension){return 'postcard-'+current.seed.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)+'-'+(current.mode||'waterfront')+'.'+extension;}
$('png').addEventListener('click',async()=>{
  const exportSVG=svg,exportFilename=filename('png');$('png').disabled=true;status('PNGを作成中…');
  try{downloadBlob(await pngBlob(exportSVG),exportFilename);status('PNGを書き出しました（1600 × 2000）。');}
  catch(error){status(error.message);}finally{$('png').disabled=false;}
});
$('settings-save').addEventListener('click',()=>{downloadBlob(new Blob([JSON.stringify({engine:current.version,seed:current.seed,...activeConfig},null,2)],{type:'application/json'}),filename('json'));status('設定を書き出しました。');});
$('share').addEventListener('click',async()=>{const url=urlFor(current.seed,activeConfig).href;try{await navigator.clipboard.writeText(url);status('URLをコピーしました。');}catch{status('URL: '+url);}});
async function compare(config=settings()){
  if(buildingGallery)return;buildingGallery=true;$('compare').disabled=true;status('36枚を生成中…');
  const next=[],urls=[],fragment=document.createDocumentFragment();
  try{
    for(let i=0;i<36;i++){
      const seed='patterns-'+String(i+1).padStart(3,'0');
      const scene=generateScene(seed,config),output=renderSVG(scene),check=validateScene(scene);
      if(check.errors.length)throw new Error(seed+': '+check.errors.join(', '));
      const url=URL.createObjectURL(svgBlob(output));urls.push(url);
      const button=document.createElement('button');button.className='thumb';button.dataset.seed=seed;button.dataset.key=cardKey(seed,config);button.setAttribute('aria-label',seed+' '+(sceneNames[scene.mode]||'水辺')+' を表示');button.setAttribute('aria-pressed',String(seed===current.seed&&cardKey(seed,config)===cardKey(current.seed,activeConfig)));
      const img=document.createElement('img');img.src=url;img.alt='';img.width=160;img.height=200;img.loading='lazy';
      const label=document.createElement('span');label.textContent=seed;
      const name=document.createElement('small');name.textContent=sceneNames[scene.mode]||'水辺';
      button.append(img,label,name);button.addEventListener('click',()=>{show(seed,config);$('art').scrollIntoView({block:'start',behavior:'auto'});});fragment.append(button);next.push({seed,config});
      if(i%6===5)await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    $('gallery').replaceChildren(fragment);galleryURLs.forEach(url=>URL.revokeObjectURL(url));galleryURLs=urls;gallery=next;
    $('gallery-config').textContent=`${config.version==='0.1'?'0.1 水辺':config.scene==='auto'?'風景おまかせ':sceneNames[config.scene]} / ${config.palette==='auto'?'配色おまかせ':PALETTES.find(p=>p.id===config.palette)?.name||config.palette}`;
    status('36枚を生成しました。');
  }catch(error){urls.forEach(url=>URL.revokeObjectURL(url));status(error.message);}finally{buildingGallery=false;$('compare').disabled=false;}
}
$('compare').addEventListener('click',()=>compare());
window.addEventListener('pagehide',()=>{galleryURLs.forEach(url=>URL.revokeObjectURL(url));galleryURLs=[];});
window.addEventListener('pageshow',event=>{if(event.persisted&&gallery.length)compare(gallery[0].config);});
const initial=readURL();show(initial.seed,initial.config,false);
