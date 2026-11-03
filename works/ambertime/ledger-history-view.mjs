// Pure historical markup only. No game, modal, worker or lifecycle ownership.
import {ageLabel,monthLabel} from './model.mjs?v=stage4-r2';
import {shortChange} from './tasting-view.mjs?v=stage4-r2';
import {flavorTypeView as sourceFlavorTypeView} from './flavor-types.mjs?v=stage4-r2';
import {FLAVOR_AXES as sourceFlavorAxes,flavorMeter as sourceFlavorMeter} from './flavor-view.mjs?v=formal-copy-r1';
import {uiText} from './ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1';
const FLAVOR_AXES=sourceFlavorAxes.map(axis=>({...axis,label:uiText(axis.label)}));
const flavorTypeView=profile=>uiText(sourceFlavorTypeView(profile));
const flavorMeter=(...args)=>uiText(sourceFlavorMeter(...args));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known=(n,format=String)=>Number.isFinite(n)?format(n):'記録なし';
const knownProfile=p=>FLAVOR_AXES.every(({key})=>Number.isFinite(p?.[key]));
export const recordText=text=>typeof text==='string'&&text.trim()?'<p class="record-text">'+esc(text)+'</p>':'';
export function ledgerProfile(profile,previous=null){return profile?(knownProfile(profile)?flavorTypeView(profile):'<p>風味の記録なし</p>')+FLAVOR_AXES.map(({label,key})=>'<section class="tasting-flavor"><h3>'+esc(label)+'</h3>'+flavorMeter(profile,key,{previousProfile:previous})+'</section>').join(''):'<p>原酒の特徴 記録なし</p>';}
export function caskTimeline(c){
 const groups=new Map(),add=(age,html,text=null)=>{const key=Number.isFinite(age)?age:null;if(!groups.has(key))groups.set(key,{html:'',texts:new Set()});const group=groups.get(key);if(text!==null){if(group.texts.has(text))return;group.texts.add(text);}group.html+=html;};
 const samples=c.samples??[];samples.forEach((sample,i)=>{add(sample.age,'<div class="ledger-taste" data-sample="'+i+'"><h4>試飲</h4>'+ledgerProfile(sample.profile,i?samples[i-1].profile:null)+'</div>');for(const t of sample.text??[])add(sample.age,recordText(t),t);if(i&&knownProfile(sample.profile)&&knownProfile(samples[i-1].profile))add(sample.age,recordText(shortChange(sample,samples[i-1])));});
 for(const h of c.history??[]){const age=Number.isFinite(h.age)?h.age:Number.isFinite(h.month)&&Number.isFinite(c.filledMonth)?h.month-c.filledMonth:null;const sameTasting=samples.some(sample=>sample.age===age&&typeof h.text==='string'&&(sample.text??[]).join('。').replace(/。+$/,'')===h.text.replace(/。+$/,''));if(!sameTasting)add(age,recordText(h.text),h.text);}
 for(const o of c.observations??[])for(const text of [o.title,o.text].filter(Boolean))add(o.age,recordText(text),text);
 for(const choice of c.choices??[])if(!(choice.key==='cool'&&(c.observations??[]).some(o=>o.eventId==='manual-cool'&&o.age===choice.age)))add(choice.age,recordText(choice.text),choice.text);
 const shownVolumes=new Set();for(const v of c.volumeHistory??[]){const key=[v.age,v.month,v.litres].join(':');if(shownVolumes.has(key))continue;shownVolumes.add(key);add(v.age,'<p class="ledger-volume">'+esc(known(v.month,monthLabel))+' · '+esc(known(v.litres,n=>n.toFixed(1)+' L'))+'</p>');}
 if(!groups.size)return '<p>試飲・熟成の記録なし</p>';
 return '<ol class="record-timeline">'+[...groups].sort((a,b)=>(a[0]??Infinity)-(b[0]??Infinity)).map(([age,g])=>'<li data-age="'+(age??'unknown')+'"><time>'+esc(known(age,ageLabel))+'</time>'+g.html+'</li>').join('')+'</ol>';
}
export function recordTimeline(samples=[],observations=[],choices=[],withChanges=false){
 const ages=new Map(),add=(age,html)=>{if(html)ages.set(age,(ages.get(age)??'')+html);};
 samples.forEach((sample,i)=>{add(sample.age,(sample.text??[]).map(recordText).join(''));if(withChanges&&i)add(sample.age,shortChange(sample,samples[i-1]).split(' · ').map(recordText).join(''));});
 observations.forEach(o=>add(o.age,recordText(o.title)+(o.text!==o.title?recordText(o.text):'')));
 choices.filter(c=>c.key!=='cool'||!observations.some(o=>o.eventId==='manual-cool'&&o.age===c.age)).forEach(c=>add(c.age,recordText(c.text)));
 return ages.size?'<ol class="record-timeline">'+[...ages].sort((a,b)=>a[0]-b[0]).map(([age,html])=>'<li data-age="'+age+'"><time>'+ageLabel(age)+'</time>'+html+'</li>').join('')+'</ol>':'';
}
