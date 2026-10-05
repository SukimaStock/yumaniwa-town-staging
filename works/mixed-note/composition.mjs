import {toHiragana,toKatakana} from './vendor/wanakana.mjs';
// Keep the textarea as the composition buffer: edits/cursor/OS IME remain native.
// These functions derive a reading; they never replace the user's source.
export function reading(raw,{final=true}={}) {
  return raw.replace(/[a-z'-]+/gi,s=>{
    let value=toHiragana(s.toLowerCase(),{IMEMode:true});
    return final?value.replace(/n$/,'ん'):value;
  });
}
export function japaneseReading(raw){return reading(raw.replace(/\s+/gu,'')).replaceAll('.','。').replaceAll(',','、');}
export const complete=raw=>/^[ぁ-ゖー]+$/u.test(reading(raw));
export const kana=raw=>reading(raw);
export const katakana=raw=>toKatakana(reading(raw));
