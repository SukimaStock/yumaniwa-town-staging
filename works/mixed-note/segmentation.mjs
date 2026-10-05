import {complete,reading} from './composition.mjs';
import {englishWords as lexicon} from './english-lexicon.mjs';
const ambiguous=new Set('a i to no go so make same mine sushi radio tomato camera'.split(' '));
const proper=['SukimaStock','PUMPOKO','GitHub','JavaScript','iPhone','iPad','ORBIT'];
const terms=[...lexicon].filter(w=>w.length>=3&&!ambiguous.has(w)&&(!complete(w)||w.length>=4)).sort((a,b)=>b.length-a.length);
function score(raw,kind,{englishContext=false,known=false}={}){
  const valid=complete(raw), n=raw.length;
  if(kind==='ja')return valid?n-2+(englishContext?-6:0):-Infinity;
  // Dictionary membership, phonotactic completeness and context compete.
  return n-5+(known?10:0)+(valid?-5:2)+(englishContext?7:0);
}
const PATHS=12, WORD_PATHS=8;
const identity = path => path.parts.map(s=>`${s.start}:${s.end}:${s.language}`).join('|');
function keep(paths,limit=PATHS) {
  const unique=new Map();
  for(const p of paths) { const key=identity(p);if(!unique.has(key)||unique.get(key).score<p.score)unique.set(key,p); }
  return [...unique.values()].sort((a,b)=>b.score-a.score||a.parts.length-b.parts.length).slice(0,limit);
}
function join(paths,next) {return keep(paths.flatMap(p=>next.map(q=>({parts:[...p.parts,...q.parts],score:p.score+q.score}))));}
function wordPaths(raw,offset,context,state) {
  const lower=raw.toLowerCase(),cache=new Map();
  const valid=text=>{if(!cache.has(text))cache.set(text,complete(text));return cache.get(text);};
  const part=(a,b,language,reason,value,surface)=>({start:offset+a,end:offset+b,raw:raw.slice(a,b),language,text:surface??(language==='ja'?reading(raw.slice(a,b)):raw.slice(a,b)),reason,evidence:value,uncertain:language==='en'&&!lexicon.has(raw.slice(a,b).toLowerCase())});
  const one=(language,reason,value,surface)=>[{parts:[part(0,raw.length,language,reason,value,surface)],score:Object.values(value).reduce((a,b)=>a+b,0)}];
  const entry=state.dictionary?.find(e=>e.raw.toLowerCase()===lower);
  if(entry)return one('dictionary','ユーザー辞書',{dictionary:raw.length+20},entry.value);
  const learned=Object.hasOwn(state.memory??{},lower)?state.memory[lower]:null;
  if(learned)return one(learned,'明示した言語の修正',{memory:raw.length+20});
  if(raw==='I'||proper.includes(raw)||/^[A-Z]{2,}$/.test(raw)||/[a-z][A-Z]/.test(raw)||/^[A-Z][a-z]/.test(raw))return one('en','大文字・固有名詞',{case:raw.length+20});
  const wholeValid=valid(raw),known=lexicon.has(lower)||ambiguous.has(lower);
  const alternatives=one('en','全体の英語候補',{english:score(raw,'en',{...context,known:known&&!ambiguous.has(lower)})});
  if(wholeValid)alternatives.push(...one('ja','全体の日本語候補',{romaji:score(raw,'ja',context)}));
  const userTerms=(state.dictionary??[]).filter(e=>typeof e.raw==='string'&&typeof e.value==='string'&&e.raw.length>=2&&e.raw.length<=64);
  const cuts=new Set([0,raw.length]);
  for(const w of [...terms,...userTerms.map(e=>e.raw.toLowerCase())]) {
    let at=lower.indexOf(w);while(at>=0){cuts.add(at);cuts.add(at+w.length);at=lower.indexOf(w,at+1);}
  }
  // Bounded search: retain whole-language alternatives for pathological runs.
  if(cuts.size>48)return keep(alternatives,WORD_PATHS);
  const nodes=[...cuts].sort((a,b)=>a-b),best=new Map([[0,[{parts:[],score:0}]]]);
  for(const at of nodes) {
    const paths=best.get(at);if(!paths)continue;
    const put=(end,language,reason,evidence,surface)=>{
      const edge=part(at,end,language,reason,evidence,surface),value=Object.values(evidence).reduce((a,b)=>a+b,0);
      best.set(end,keep([...(best.get(end)??[]),...paths.map(p=>({parts:[...p.parts,edge],score:p.score+value}))],WORD_PATHS));
    };
    for(const end of nodes)if(end>at&&valid(raw.slice(at,end)))put(end,'ja','ローマ字の成立と経路比較',{romaji:end-at,boundary:-2,context:context.englishContext?-6:0});
    for(const e of userTerms)if(lower.startsWith(e.raw.toLowerCase(),at))put(at+e.raw.length,'dictionary','ユーザー辞書の区間',{dictionary:e.raw.length+20},e.value);
    for(const w of terms)if(lower.startsWith(w,at)) {
      const whole=at===0&&w.length===raw.length;
      const end=at+w.length;
      const broken=wholeValid?[at,end].filter(p=>p>0&&p<raw.length&&/[a-z]/i.test(reading(raw.slice(0,p),{final:false}))).length:0;
      put(end,'en','英単語候補を日本語経路と比較',whole?{english:score(raw,'en',{...context,known:true})}:{english:w.length+9,boundary:-5,phonology:valid(w)?0:1,syllableBoundary:-3*broken});
    }
  }
  // Reserve both whole-language alternatives even if the beam prefers islands.
  const ranked=keep(best.get(raw.length)??[],WORD_PATHS-2);
  return keep([...ranked,...alternatives],WORD_PATHS);
}
function mergeJapanese(out) {
  const merged=[];
  for(let i=0;i<out.length;i++) {
    const s={...out[i]},previous=merged.at(-1);
    if(s.language==='ja'&&previous?.language==='ja'){previous.end=s.end;previous.raw+=s.raw;previous.text+=s.text;continue;}
    if(s.language==='literal'&&/^[ .,]+$/.test(s.raw)&&previous?.language==='ja') {
      if(/[.,]/.test(s.raw)){previous.end=s.end;previous.raw+=s.raw;previous.text+=s.raw.replaceAll('.','。').replaceAll(',','、').trim();continue;}
      if(out[i+1]?.language==='ja'){previous.end=s.end;previous.raw+=s.raw;continue;}
    }
    merged.push(s);
  }
  return merged;
}
export function segmentCandidates(source,state={}) {
  const chunks=[...source.matchAll(/https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|`[^`\n]*`|[A-Za-z]+(?:'[A-Za-z]+)*|[^A-Za-z]+/g)];
  const evidence=t=>t&&(t==='I'||lexicon.has(t.toLowerCase())&&!ambiguous.has(t.toLowerCase()));
  let paths=[{parts:[],score:0}];
  for(let n=0;n<chunks.length;n++) {
    const m=chunks[n],raw=m[0],start=m.index;
    if(!/^[a-z']+$/i.test(raw)||raw.length>256) {
      paths=join(paths,[{parts:[{start,end:start+raw.length,raw,language:raw.length>256?'en':'literal',text:raw,reason:'保護された原文',uncertain:raw.length>256}],score:0}]);continue;
    }
    const context={englishContext:evidence(chunks[n-2]?.[0])&&evidence(chunks[n+2]?.[0])};
    const pattern=new RegExp(proper.join('|')+'|[A-Z]{2,}','g');let at=0,options=[{parts:[],score:0}];
    for(const p of raw.matchAll(pattern)) {
      if(p.index>at)options=join(options,wordPaths(raw.slice(at,p.index),start+at,context,state));
      options=join(options,[{parts:[{start:start+p.index,end:start+p.index+p[0].length,raw:p[0],language:'en',text:p[0],reason:'固有名詞の強いシグナル',evidence:{case:20}}],score:20}]);at=p.index+p[0].length;
    }
    if(at<raw.length)options=join(options,wordPaths(raw.slice(at),start+at,context,state));
    paths=join(paths,options);
  }
  return keep(paths.map(p=>{
    const parts=mergeJapanese(p.parts);let context=0;
    const neighbour=(at,step)=>{let i=at+step;while(parts[i]?.language==='literal'&&/^[ \t]+$/.test(parts[i].raw))i+=step;return parts[i];};
    // Isolated short Japanese remnants are weak boundary evidence. Penalize
    // them symmetrically; no particular English word or sentence is exempted.
    for(let i=0;i<parts.length;i++) {
      const s=parts[i],left=neighbour(i,-1),right=neighbour(i,1);
      if(s.language==='ja'&&reading(s.raw).length<=2&&(left?.language==='en'||right?.language==='en'))context-=2;
      if(left?.language==='en'&&right?.language==='en')context+=s.language==='en'?4:s.language==='ja'?-4:0;
      if(s.language==='en'&&left?.language==='en'&&s.start===left.end)context-=2;
    }
    return {...p,parts,score:p.score+context,context};
  }));
}
export function segment(source,state={}) {return segmentCandidates(source,state)[0]?.parts??[];}
