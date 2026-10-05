import {complete,reading} from './composition.mjs';
const lexicon=new Set('the this that these those with without from for of and or but as at by in on into hello thanks please good morning night today tomorrow yesterday want need like love have has had can could would should will do does did is are was were be been my your our their it its you we they he she write writing read reading create creating design game games app apps work works code coding prototype staging production feedback release update test tests editor browser github google safari iphone ipad javascript python note suno push commit pull request engine build sound music visual visuals texture smooth transition save copy undo redo draft local text staff member members meeting mtg email internet quux'.split(' '));
const ambiguous=new Set('a i to no go so make same mine sushi radio tomato camera'.split(' '));
const proper=['SukimaStock','PUMPOKO','GitHub','JavaScript','iPhone','iPad','ORBIT'];
const terms=[...lexicon].filter(w=>w.length>=3&&!ambiguous.has(w)&&(!complete(w)||w.length>=4)).sort((a,b)=>b.length-a.length);
function score(raw,kind,{englishContext=false,known=false}={}){
  const valid=complete(raw), n=raw.length;
  if(kind==='ja')return valid?n-2+(englishContext?-6:0):-Infinity;
  // Dictionary membership, phonotactic completeness and context compete.
  return n-5+(known?10:0)+(valid?-5:2)+(englishContext?7:0);
}
function wordSpans(raw,offset,context,state){
  const lower=raw.toLowerCase();
  const entry=state.dictionary?.find(e=>e.raw.toLowerCase()===lower);
  if(entry)return [{start:offset,end:offset+raw.length,raw,language:'dictionary',text:entry.value,reason:'ユーザー辞書',candidates:[entry.value]}];
  const learned=Object.hasOwn(state.memory??{},lower)?state.memory[lower]:null;
  const candidates=[];
  const add=(a,b,kind,reason,uncertain=false)=>candidates.push({start:offset+a,end:offset+b,raw:raw.slice(a,b),language:kind,text:kind==='ja'?reading(raw.slice(a,b)):raw.slice(a,b),reason,uncertain});
  if(learned){add(0,raw.length,learned,'明示した言語の修正');return candidates;}
  if(raw==='I'||proper.includes(raw)||/^[A-Z]{2,}$/.test(raw)||/[a-z][A-Z]/.test(raw)||/^[A-Z][a-z]/.test(raw)){add(0,raw.length,'en','大文字・固有名詞');return candidates;}
  const userTerms=(state.dictionary??[]).filter(e=>typeof e.raw==='string'&&typeof e.value==='string'&&e.raw.length>=2&&e.raw.length<=64);
  const known=lexicon.has(lower)||ambiguous.has(lower);
  const ja=score(raw,'ja',context),en=score(raw,'en',{...context,known:known&&!ambiguous.has(lower)});
  // A complete isolated word has competing JA/EN scores, including short particles.
  if(!userTerms.some(e=>lower.includes(e.raw.toLowerCase()))&&complete(raw)&&(!terms.some(w=>lower.includes(w)&&w!==lower)||raw.length<8)){
    add(0,raw.length,en>ja?'en':'ja',`局所スコア 日本語:${ja} / 英語:${en}`,Math.abs(ja-en)<4);return candidates;
  }
  // Known English islands are considered only on complete kana boundaries.
  const cuts=new Set([0,raw.length]);
  for(const w of [...terms,...userTerms.map(e=>e.raw.toLowerCase())]){let p=lower.indexOf(w);while(p>=0){cuts.add(p);cuts.add(p+w.length);p=lower.indexOf(w,p+1);}}
  const boundaries=[...cuts].sort((a,b)=>a-b);
  const best=new Array(raw.length+1).fill(null);best[0]={value:0,parts:[]};
  for(let i=0;i<raw.length;i++)if(best[i]){
    const put=(end,kind,value,reason,surface)=>{const total=best[i].value+value;if(!best[end]||best[end].value<total)best[end]={value:total,parts:[...best[i].parts,{i,end,kind,reason,surface}]};};
    for(const j of boundaries)if(j>i&&complete(raw.slice(i,j)))put(j,'ja',j-i-2,'音境界上の日本語候補');
    for(const e of userTerms)if(lower.startsWith(e.raw.toLowerCase(),i))put(i+e.raw.length,'dictionary',e.raw.length+20,'ユーザー辞書の区間',e.value);
    for(const w of terms)if(lower.startsWith(w,i))put(i+w.length,'en',score(w,'en',{known:true}),'英語候補・綴り・区間の競合');
  }
  const path=best[raw.length];
  if(path&&path.parts.some(p=>p.kind==='en'||p.kind==='dictionary')&&path.value>en){for(const p of path.parts){add(p.i,p.end,p.kind,p.reason);if(p.surface)candidates.at(-1).text=p.surface;}}
  else add(0,raw.length,en>ja?'en':'ja',`局所スコア 日本語:${ja} / 英語:${en}`,!known);
  return candidates;
}
export function segment(source,state={}){
  const chunks=[...source.matchAll(/https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|`[^`\n]*`|[A-Za-z]+(?:'[A-Za-z]+)*|[^A-Za-z]+/g)],out=[];
  const evidence=t=>t&&(t==='I'||lexicon.has(t.toLowerCase())&&!ambiguous.has(t.toLowerCase()));
  for(let n=0;n<chunks.length;n++){
    const m=chunks[n],raw=m[0],start=m.index;
    if(!/^[a-z']+$/i.test(raw)){out.push({start,end:start+raw.length,raw,language:'literal',text:raw,reason:'URL・記号・既存の日本語を保持'});continue;}
    const context={englishContext:evidence(chunks[n-2]?.[0])&&evidence(chunks[n+2]?.[0])};
    if(raw.length>256){out.push({start,end:start+raw.length,raw,language:'en',text:raw,uncertain:true,reason:'長い連続語は原文を保持'});continue;}
    // Split uppercase/protected islands before reading lower-case neighbours.
    const pattern=new RegExp(proper.join('|')+'|[A-Z]{2,}','g');let at=0;
    for(const p of raw.matchAll(pattern)){
      if(p.index>at)out.push(...wordSpans(raw.slice(at,p.index),start+at,context,state));
      out.push({start:start+p.index,end:start+p.index+p[0].length,raw:p[0],language:'en',text:p[0],reason:'固有名詞の区間を保持'});at=p.index+p[0].length;
    }
    if(at<raw.length)out.push(...wordSpans(raw.slice(at),start+at,context,state));
  }
  // Rejoin Japanese across typed spaces; preserve gaps beside English and linebreaks.
  const merged=[];
  for(let i=0;i<out.length;i++){
    const s={...out[i]},previous=merged.at(-1);
    if(s.language==='ja'&&previous?.language==='ja'){previous.end=s.end;previous.raw+=s.raw;previous.text+=s.text;continue;}
    if(s.language==='literal'&&/^[ .,]+$/.test(s.raw)&&previous?.language==='ja'){
      if(/[.,]/.test(s.raw)){previous.end=s.end;previous.raw+=s.raw;previous.text+=s.raw.replaceAll('.','。').replaceAll(',','、').trim();continue;}
      if(out[i+1]?.language==='ja'){previous.end=s.end;previous.raw+=s.raw;continue;}
    }
    merged.push(s);
  }
  return merged;
}
