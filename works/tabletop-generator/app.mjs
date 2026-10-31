import {normalizeSettings,generateScene,DRINKS,FRUITS,TABLE_PALETTES,STUDIES} from './engine.mjs?sardines=03';
import {renderSVG} from './renderer.mjs?sardines=03';
import {download,svgBlob,pngBlob} from './exporter.mjs';
const $=id=>document.getElementById(id);
let settings,scene,svg;
for(const [key,options]of Object.entries({study:STUDIES,drink:DRINKS,fruit:FRUITS,palette:Object.entries(TABLE_PALETTES).map(([id,p])=>({id,name:p.name}))})){
 for(const value of options){const option=document.createElement('option');option.value=value.id;option.textContent=value.name;$(key).append(option);}
}
function announce(text){$('status').textContent=text;}
function show(input){
 settings=normalizeSettings(input);scene=generateScene(settings);svg=renderSVG(scene);
 $('art').innerHTML=svg;$('texture').value=settings.texture;
 const current=settings.version===3,meal=current&&settings.study!=='table-01';
 $('study-control').hidden=!current;
 if(current)$('study').value=settings.study;
 for(const key of ['drink','fruit','palette']){$(key+'-control').hidden=!current||(meal&&key!=='palette');if(current&&settings[key])$(key).value=settings[key];}
 const title=settings.version===3?scene.title:settings.version===1?`初版 · ${settings.seed}`:settings.study.startsWith('wine-lemon-')?'ワインとレモン':'レモンのある食卓';
 $('caption').textContent=title;document.title='器と食卓 — '+title;$('reset').hidden=settings.version===3;
 const url=new URL(location.href);url.search='';for(const [key,value]of Object.entries(settings))url.searchParams.set(key,String(value));history.replaceState(null,'',url);
}
function filename(s,ext){const identity=s.version===3?`${s.study==='table-01'?s.drink+'-'+s.fruit:s.study}-${s.palette}`:s.version===1?s.seed.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50):s.study;return `tabletop-${identity}-${s.texture}.${ext}`;}
for(const key of ['texture','study','drink','fruit','palette'])$(key).onchange=()=>{show({...settings,[key]:$(key).value});announce('');};
$('reset').onclick=()=>{show({version:3});announce('');};
$('svg').onclick=()=>{download(svgBlob(svg),filename(settings,'svg'));announce('SVGの保存を開始しました');};
$('png').onclick=async()=>{const snapshot={...settings},source=svg,w=scene.width,h=scene.height;$('png').disabled=true;try{download(await pngBlob(source,w,h),filename(snapshot,'png'));announce('PNGの保存を開始しました');}catch(e){announce(e.message);}finally{$('png').disabled=false;}};
$('json').onclick=()=>{download(new Blob([JSON.stringify(settings,null,2)+'\n'],{type:'application/json'}),filename(settings,'json'));announce('設定JSONの保存を開始しました');};
$('share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'器と食卓',url:location.href});else{await navigator.clipboard.writeText(location.href);announce('URLをコピーしました');}}catch(e){if(e.name!=='AbortError')announce('URLはアドレス欄からコピーできます');}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>65536)throw Error('設定ファイルが大きすぎます');const input=JSON.parse(await f.text());
 const keys=input?.version===1?['seed','composition','palette','density','texture']:input?.version===2?['study','texture']:input?.version===3?(input.study==='table-01'?['study','drink','fruit','palette','texture']:['study','palette','texture']):null;
 if(!keys||!keys.every(k=>typeof input[k]==='string'))throw Error('この作品の設定JSONを選んでください');const normalized=normalizeSettings(input);if(keys.some(k=>input[k]!==normalized[k]))throw Error('設定JSONの値を確認してください');show(normalized);announce('設定JSONを読み込みました');
 }catch(error){announce(error.message);}finally{e.target.value='';}};
show(Object.fromEntries(new URL(location.href).searchParams));
