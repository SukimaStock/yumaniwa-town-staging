import {segment} from './segmentation.mjs';
import {japaneseReading} from './composition.mjs';
export async function convertSource(source,state,convert){
  const result=[];
  for(const span of segment(source,state)){
    if(span.language!=='ja'){result.push(span);continue;}
    const kana=japaneseReading(span.raw);
    if(kana.length>512)throw new Error('日本語の区間が長いため、改行か英語区間で分けてください。');
    const converted=await convert(kana);
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
