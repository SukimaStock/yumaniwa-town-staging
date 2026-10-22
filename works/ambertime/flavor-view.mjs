import {flavorSummary} from './lab-flavor.mjs?v=stage4-r2';
import {tasting} from './model.mjs?v=stage4-r2';
import {shortTaste} from './tasting-view.mjs?v=stage4-r2';

// One fixed display scale covers every existing flavor indicator, including wood.
export const FLAVOR_MAX=1.35;
export const FLAVOR_AXES=Object.freeze([
 Object.freeze({label:'刺激',key:'roughness',index:0}),
 Object.freeze({label:'原酒の香り',key:'character',index:1}),
 Object.freeze({label:'木の香り',key:'wood',index:2})
]);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=n=>Number.isFinite(n)&&n>=0&&n<=FLAVOR_MAX;
export function flavorPhrase(profile,key){
 const summary=flavorSummary(profile)?.find(a=>a.key===key);if(summary)return summary.label+' · '+(summary.value<.3?'控えめ':summary.value<.65?'ほどよく感じる':'豊か');
 const axis=FLAVOR_AXES.find(x=>x.key===key);if(!axis||!valid(profile?.[key]))return null;
 return shortTaste({text:tasting(profile).split('。').filter(Boolean)})[axis.index]??null;
}
export function flavorMeter(profile,key,{previousProfile=null,previousLabel='前回'}={}){
 const axis=FLAVOR_AXES.find(x=>x.key===key),value=flavorSummary(profile)?.find(a=>a.key===key)?.value??profile?.[key];
 if(!axis||!valid(value))return '<span class="flavor-missing">不明</span>';
 const phrase=flavorPhrase(profile,key),previous=flavorSummary(previousProfile)?.find(a=>a.key===key)?.value??previousProfile?.[key],hasPrevious=valid(previous);
 const direction=hasPrevious?(value===previous?'前回と同じ':value>previous?'前回より増加':'前回より減少'):null;
 const previousText=hasPrevious?previousLabel+' '+previous+'、'+direction:null;
 return '<span class="flavor-view"><span class="nearby-meter flavor-track" role="meter" aria-label="'+esc(axis.label)+'" aria-valuemin="0" aria-valuemax="'+FLAVOR_MAX+'" aria-valuenow="'+value+'" aria-valuetext="'+esc('現在 '+value+'、'+phrase+(previousText?'。'+previousText:''))+'"><i class="flavor-fill" style="width:'+value/FLAVOR_MAX*100+'%"></i>'+(hasPrevious?'<span class="flavor-previous" style="left:'+previous/FLAVOR_MAX*100+'%" aria-hidden="true"></span>':'')+'</span><small class="flavor-phrase">'+esc(phrase)+'</small></span>';
}
