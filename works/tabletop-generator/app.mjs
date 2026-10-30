import {normalizeSettings,generateScene} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
import {download,svgBlob,pngBlob} from './exporter.mjs';
const $=id=>document.getElementById(id);
let settings,scene,svg;
function announce(text){$('status').textContent=text;}
function show(input){
 settings=normalizeSettings(input);scene=generateScene(settings);svg=renderSVG(scene);
 $('art').innerHTML=svg;$('texture').value=settings.texture;
 $('caption').textContent=settings.version===1?`初版 · ${settings.seed}`:settings.study==='wine-lemon-01'?'ワインとレモン':'レモンのある食卓';$('reset').hidden=settings.version!==1&&settings.study!=='lemon-01';
 const url=new URL(location.href);url.search='';
 for(const [key,value]of Object.entries(settings))url.searchParams.set(key,String(value));
 history.replaceState(null,'',url);
}
function filename(s,ext){return `tabletop-${s.version===1?s.seed.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50):s.study}-${s.texture}.${ext}`;}
$('texture').onchange=()=>{show({...settings,texture:$('texture').value});announce('');};
$('reset').onclick=()=>{show({version:2});announce('');};
$('svg').onclick=()=>{download(svgBlob(svg),filename(settings,'svg'));announce('SVGの保存を開始しました');};
$('png').onclick=async()=>{const snapshot={...settings},source=svg,w=scene.width,h=scene.height;$('png').disabled=true;try{download(await pngBlob(source,w,h),filename(snapshot,'png'));announce('PNGの保存を開始しました');}catch(e){announce(e.message);}finally{$('png').disabled=false;}};
$('json').onclick=()=>{download(new Blob([JSON.stringify(settings,null,2)+'\n'],{type:'application/json'}),filename(settings,'json'));announce('設定JSONの保存を開始しました');};
$('share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'器と食卓',url:location.href});else{await navigator.clipboard.writeText(location.href);announce('URLをコピーしました');}}catch(e){if(e.name!=='AbortError')announce('URLはアドレス欄からコピーできます');}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>65536)throw Error('設定ファイルが大きすぎます');const input=JSON.parse(await f.text());const keys=input?.version===1?['seed','composition','palette','density','texture']:input?.version===2?['study','texture']:null;if(!keys||!keys.every(k=>typeof input[k]==='string'))throw Error('この作品の設定JSONを選んでください');const normalized=normalizeSettings(input);if(keys.some(k=>input[k]!==normalized[k]))throw Error('設定JSONの値を確認してください');show(normalized);announce('設定JSONを読み込みました');}catch(error){announce(error.message);}finally{e.target.value='';}};
const params=Object.fromEntries(new URL(location.href).searchParams);
// Old shared URLs use v=1; new URLs/JSON use version=2.
show(params);
