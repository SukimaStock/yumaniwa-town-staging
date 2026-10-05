import {segmentCandidates} from './segmentation.mjs?v=paths-20261005';
import {japaneseReading} from './composition.mjs';
// Current engine API exposes candidates, not calibrated path/POS costs. This
// is deliberately modest dictionary-support evidence, not a grammar oracle.
export function conversionEvidence(converted,kana) {
  if(!converted?.segments?.length||converted.segments.map(s=>s.key).join('')!==kana)throw new Error('変換エンジンの読みが一致しません。');
  let support=0;
  for(const s of converted.segments) {
    const top=s.candidates?.[0];if(typeof top!=='string')throw new Error('漢字候補を確認できません。');
    const han=[...top.matchAll(/\p{Script=Han}/gu)].length;
    const weight=han&&(s.key.length>=3||han>=2)?1:han?0.1:/[ァ-ヺ]/u.test(top)?0.15:0.45;
    support+=s.key.length*weight;
  }
  return support;
}
export async function rankSegmentation(source,state,convert) {
  const cache=new Map(),ranked=[];
  const paths=segmentCandidates(source,state);
  const references=[...new Map(paths.flatMap(p=>p.parts.filter(s=>s.language==='ja').map(s=>[`${s.start}:${s.end}`,s]))).values()];
  async function get(kana) {
    if(kana.length>512)throw new Error('日本語の区間が長いため、改行か英語区間で分けてください。');
    if(!cache.has(kana))cache.set(kana,Promise.resolve().then(()=>convert(kana)));
    return cache.get(kana);
  }
  for(const path of paths) {
    let support=0,continuity=0;
    for(const s of path.parts)if(s.language==='ja') {
      const kana=japaneseReading(s.raw);
      support+=conversionEvidence(await get(kana),kana);
    }
    for(const s of path.parts)if(s.language==='en'&&!s.evidence?.case&&!s.evidence?.memory) {
      const reference=references.filter(r=>r.start<=s.start&&s.end<=r.end).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
      if(!reference)continue;
      const converted=await get(japaneseReading(reference.raw));let at=0;
      const cuts=[s.start,s.end].map(p=>japaneseReading(source.slice(reference.start,p)).length);
      for(const item of converted.segments) {
        const end=at+item.key.length,top=item.candidates[0];
        // A split through a supported Japanese lexeme is weaker than a split
        // at its boundary. This applies to any word, not just had or home.
        if(item.key.length>=3&&/\p{Script=Han}/u.test(top))continuity-=3*cuts.filter(c=>at<c&&c<end).length;
        at=end;
      }
    }
    ranked.push({...path,languageScore:path.score,conversion:support,continuity,score:path.score+support+continuity});
  }
  ranked.sort((a,b)=>b.score-a.score||a.parts.length-b.parts.length);
  return {ranked,get,conversionCalls:cache.size};
}
export async function convertSource(source,state,convert){
  const {ranked,get}=await rankSegmentation(source,state,convert);
  const result=[];
  for(const span of ranked[0]?.parts??[]){
    if(span.language!=='ja'){result.push(span);continue;}
    const kana=japaneseReading(span.raw);
    if(kana.length>512)throw new Error('日本語の区間が長いため、改行か英語区間で分けてください。');
    const converted=await get(kana);
    if(!converted?.segments?.length||converted.segments.map(s=>s.key).join('')!==kana)throw new Error('変換エンジンの読みが一致しません。');
    let at=span.start, offset=0;
    // Map each kana boundary back to raw source. A syllable/nn is never split.
    for(const s of converted.segments){
      offset+=s.key.length;let end=null;
      for(let p=at+1;p<=span.end;p++){
        if(japaneseReading(source.slice(span.start,p))===kana.slice(0,offset)){end=p;break;}
      }
      // The raw length includes spaces between kana. Preserve every source byte.
      if(s===converted.segments.at(-1))end=span.end;
      if(end===null||end<=at)throw new Error('文節の原文位置を確認できません。原文を編集して再試行してください。');
      result.push({start:at,end,raw:source.slice(at,end),language:'ja',text:s.candidates[0],candidates:s.candidates,reading:s.key,reason:'Mozcの文節候補',uncertain:span.uncertain});at=end;
    }
  }
  return result;
}
