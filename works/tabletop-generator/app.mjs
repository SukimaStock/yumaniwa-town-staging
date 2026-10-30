import {normalizeSettings,generateScene} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
import {download,svgBlob,pngBlob} from './exporter.mjs';
const $=id=>document.getElementById(id),keys=['composition','palette','density','texture','seed'];
let settings,scene,svg,galleryURLs=[];
function announce(s){$('status').textContent=s;}
function read(){return normalizeSettings(Object.fromEntries(keys.map(k=>[k,$(k).value])));}
function clearGallery(){galleryURLs.forEach(URL.revokeObjectURL);galleryURLs=[];$('gallery').replaceChildren();$('comparison').hidden=true;}
function show(value,{keepGallery=false}={}){settings=normalizeSettings(value);scene=generateScene(settings);svg=renderSVG(scene);for(const k of keys)$(k).value=settings[k];$('art').innerHTML=svg;$('caption').textContent=settings.seed;const url=new URL(location.href);url.search='';for(const k of keys)url.searchParams.set(k,settings[k]);url.searchParams.set('v','1');history.replaceState(null,'',url);if(!keepGallery)clearGallery();}
function newSeed(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return `table-${bytes[0].toString(36)}${bytes[1].toString(36)}`;}
function filename(s,extension){return `tabletop-${s.composition}-${s.seed.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50)}-${s.palette}-${s.density}-${s.texture}.${extension}`;}
$('controls').addEventListener('submit',e=>{e.preventDefault();show(read());announce('同じseedを表示しました');});
for(const k of keys.filter(k=>k!=='seed'))$(k).addEventListener('change',()=>{show(read());announce('');});
$('generate').onclick=()=>{show({...read(),seed:newSeed()});announce('');};
$('svg').onclick=()=>{download(svgBlob(svg),filename(settings,'svg'));announce('SVGの保存を開始しました');};
$('png').onclick=async()=>{const snapshot={...settings},snapshotSVG=svg,w=scene.width,h=scene.height;$('png').disabled=true;try{download(await pngBlob(snapshotSVG,w,h),filename(snapshot,'png'));announce('PNGの保存を開始しました');}catch(e){announce(e.message);}finally{$('png').disabled=false;}};
$('json').onclick=()=>{download(new Blob([JSON.stringify(settings,null,2)+'\n'],{type:'application/json'}),filename(settings,'json'));announce('設定JSONの保存を開始しました');};
$('share').onclick=async()=>{const url=location.href;try{if(navigator.share){await navigator.share({title:'器と食卓',url});announce('');}else{await navigator.clipboard.writeText(url);announce('URLをコピーしました');}}catch(e){if(e.name!=='AbortError')announce('URLはアドレス欄からコピーできます');}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files[0];try{if(!file)return;if(file.size>65536)throw Error('設定ファイルが大きすぎます');const input=JSON.parse(await file.text());if(input.version!==1||!keys.every(k=>typeof input[k]==='string'))throw Error('この作品の設定JSONを選んでください');const normalized=normalizeSettings(input);if(keys.some(k=>normalized[k]!==input[k]))throw Error('設定JSONの値を確認してください');show(normalized);announce('設定JSONを読み込みました');}catch(error){announce(error.message);}finally{e.target.value='';}};
$('compare').onclick=()=>{clearGallery();const base=read();for(let i=1;i<=6;i++){const config={...base,seed:`${base.seed.slice(0,65)}-${i}`},data=generateScene(config),url=URL.createObjectURL(svgBlob(renderSVG(data)));galleryURLs.push(url);const button=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');img.src=url;img.alt=`${config.seed}の食卓`;img.width=900;img.height=720;label.textContent=config.seed;button.append(img,label);button.onclick=()=>{show(config,{keepGallery:true});announce('比較した絵を表示しました');$('art').scrollIntoView({block:'start'});};$('gallery').append(button);}$('comparison').hidden=false;announce('6枚を表示しました。絵を選ぶと拡大します');};
$('close').onclick=clearGallery;
addEventListener('pagehide',clearGallery);
const params=Object.fromEntries(new URL(location.href).searchParams);show(params);
