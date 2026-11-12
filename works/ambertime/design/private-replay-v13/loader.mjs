// Lab-only loader. Every hook requires exact reviewed source plus one exact anchor.
import {createHash} from 'node:crypto';
const helper=JSON.stringify(new URL('./adapter.mjs',import.meta.url).href);
function once(text,needle,replacement){if(text.split(needle).length!==2)throw Error('Lab hook anchor count mismatch: '+needle.slice(0,70));return text.replace(needle,replacement);}
export async function load(url,context,next){
 const out=await next(url,context),path=new URL(url).pathname;
 const audited={
  '/works/ambertime/economy.mjs':'4acb09e11e33836c5f5aaf9480ca1732e54a3203f6ef1ddd98ae671d45e57343',
  '/works/ambertime/generations.mjs':'670373d967120f2de2290da2ac29393e8861d79bd1f8dad6f0be41414a12dfa7'
 };
 for(const [suffix,expected] of Object.entries(audited))if(path.endsWith(suffix)){if(createHash('sha256').update(String(out.source)).digest('hex')!==expected)throw Error('Audited dependency source differs: '+suffix);return out;}
 if(!path.endsWith('/works/ambertime/partner-orders.mjs')&&!path.endsWith('/works/ambertime/clone-data.mjs'))return out;
 let text=String(out.source);const hash=createHash('sha256').update(text).digest('hex');
 if(path.endsWith('/clone-data.mjs')){
  if(hash!=='b668df5935a1f09c933dc82631cf828ab5b1532cdf531a91a3dcef1ebecc98d3')throw Error('clone-data baseline differs');
  text=once(text,'export function cloneReplayState(value){','export function cloneReplayState(value){const __owned=__tryOwnedClone(value);if(__owned)return __owned.value;');
  return {...out,source:`import {tryOwnedClone as __tryOwnedClone} from ${helper};\n`+text};
 }
 if(hash!=='72a73307f3938046ece2c87912dc13f95bdf0e47f9cf74a79a90828ed411a27f')throw Error('partner-orders baseline differs');
 text=once(text,'function apply(s,o,context,index){','function apply(s,o,context,index){return __scopedApply(__nativeApply,s,o,context,index);}\nfunction __nativeApply(s,o,context,index){');
 const loop='for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=withPrivateReplay(()=>apply(j,s.operations[i],context,i));';
 text=once(text,loop,'j=__runPrivateReplay(()=>{'+loop+'return j;});');
 text=once(text,"checkpoint={originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:cache,context:clone(context),partial:","__labPhase('beforeCheckpoint');checkpoint={originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:cache,context:clone(context),partial:");
 text=once(text,"partial:s.still.phase==='distilling'&&s.tastingId===null?clone(j):null};return true;","partial:s.still.phase==='distilling'&&s.tastingId===null?clone(j):null};__labPhase('afterCheckpoint');return true;");
 text+='\n// Synthetic Lab stress only; not a reader or a formal acceptance path.\nexport function __labStressMonth(s){const owned=clone(s);return __runPrivateReplay(()=>withPrivateReplay(()=>apply(owned,{key:\'month\',value:{progress:null}},emptyReplayContext(),0)));}\n';
 return {...out,source:`import {phase as __labPhase,scopedApply as __scopedApply,runPrivateReplay as __runPrivateReplay} from ${helper};\n`+text};
}
