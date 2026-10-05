import { toHiragana, toKatakana } from './vendor/wanakana.mjs';

// Independently curated for writing about creative work; not imported from Meltype.
const english = new Set(('a I the this that these those with without from for of and or but as at by in on into ' +
  'hello thanks please good morning night today tomorrow yesterday want need like love have has had can could ' +
  'would should will do does did is are was were be been my your our their it its you we they he she ' +
  'write writing read reading create creating design game games app apps work works code coding ' +
  'prototype staging production touch feeling feedback release update test tests editor browser ' +
  'Safari iPhone iPad GitHub JavaScript Python note Suno PUMPOKO SukimaStock ORBIT ' +
  'google push commit pull request engine build sound music visual visuals texture smooth transition ' +
  'make sure same mine sake sushi radio camera tomato go to no so more most much very really ' +
  'new old first last next time small large save copy undo redo draft local text').toLowerCase().split(/\s+/));
const protectedWords = new Set('sukimastock pumpoko orbit github google safari iphone ipad javascript python note suno prototype staging production touch feeling engine push commit'.split(' '));
const ambiguous = new Set('same mine sake sushi radio tomato make go to no so a i be me'.split(' '));
const terms = [...english].filter(w => w.length >= 4 && !ambiguous.has(w)).sort((a,b) => b.length-a.length);
const kanaOnly = s => /^[\u3040-\u309fー]+$/.test(s);
export const kana = raw => toHiragana(raw.toLowerCase());
export const katakana = raw => toKatakana(kana(raw));
const complete = raw => raw.length > 0 && kanaOnly(kana(raw));

export function validateEntry(raw, value) {
  if (!/^[a-z][a-z']{1,63}$/i.test(raw)) return '読みは2〜64文字のローマ字で入力してください。';
  if (!value.trim() || value.length > 128 || /[\n\r\t]/.test(value)) return '表記は改行なしの1〜128文字で入力してください。';
  return null;
}
export function remember(memory, raw, language) {
  if (!/^[a-z]{2,64}$/i.test(raw) || !['en','ja'].includes(language)) return memory;
  const key = raw.toLowerCase();
  const next = {...memory};
  // Only whole explicitly corrected segments learn. Never learn from auto acceptance.
  delete next[key];
  next[key] = language;
  return Object.fromEntries(Object.entries(next).slice(-500));
}

export function detect(source, { dictionary = [], memory = {} } = {}) {
  const segments = [];
  const add = (start,end,language,text,reason,uncertain=false) => {
    const raw = source.slice(start,end);
    segments.push({start,end,raw,language,text: text ?? raw,reason,uncertain});
  };
  const entries = dictionary.filter(e => e && typeof e.raw === 'string' && typeof e.value === 'string' && !validateEntry(e.raw,e.value))
    .slice(0,500).sort((a,b) => b.raw.length-a.raw.length);
  // Preserve native Japanese, whitespace, identifiers, URLs, code and Markdown exactly.
  const pattern = /https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|@[A-Za-z0-9_]+|`[^`\n]*`|[A-Za-z0-9]+_[A-Za-z0-9_]+|[A-Za-z]+(?:'[A-Za-z]+)*|[^A-Za-z]+/g;
  const chunks = [...source.matchAll(pattern)];
  const wordEvidence = chunk => {
    if (!chunk || !/^[a-z]+$/i.test(chunk[0])) return false;
    const s=chunk[0].toLowerCase();
    return english.has(s) && (!ambiguous.has(s) || s==='i' && chunk[0]==='I');
  };
  const neighbor = (index,dir) => {
    const gap=chunks[index+dir];
    if (gap && /^ +$/.test(gap[0])) return chunks[index+dir*2];
    return null;
  };
  for (let index=0; index<chunks.length; index++) {
    const match=chunks[index], raw=match[0], start=match.index, end=start+raw.length, lower=raw.toLowerCase();
    if (!/^[a-z]+(?:'[a-z]+)*$/i.test(raw)) {
      const previous=segments.at(-1);
      const text=previous?.language==='ja' && /^[.,]+(?:\s*)$/.test(raw) ? raw.replaceAll('.', '。').replaceAll(',', '、') : raw;
      add(start,end,'literal',text,text===raw?'既存の文章・記号を保持':'日本語の句読点'); continue;
    }
    const learned=Object.hasOwn(memory,lower) ? memory[lower] : null;
    const exact=entries.find(e=>e.raw.toLowerCase()===lower);
    if (exact) { add(start,end,'dictionary',exact.value,'ユーザー辞書'); continue; }
    if (learned==='en' || learned==='ja') { add(start,end,learned,learned==='ja'?kana(raw):raw,'明示した修正を記憶'); continue; }
    const left=neighbor(index,-1), right=neighbor(index,1);
    const englishContext=wordEvidence(left)||wordEvidence(right);
    if (english.has(lower) && (!ambiguous.has(lower) || englishContext || raw==='I')) {
      add(start,end,'en',raw,englishContext?'英単語と文脈':'英単語'); continue;
    }
    if (ambiguous.has(lower)) {
      add(start,end,complete(raw)&&raw.length>=3?'ja':'unknown',complete(raw)&&raw.length>=3?kana(raw):raw,'日本語にも英語にも読める',true); continue;
    }
    // Bound long runs so paste cannot trigger unbounded substring work.
    if (raw.length>256) { add(start,end,'unknown',raw,'長い連続入力は原文を保持',true); continue; }
    let cursor=0, plain=0;
    const flush = until => {
      if (until<=plain) return;
      const part=raw.slice(plain,until), converted=kana(part);
      const valid=complete(part);
      add(start+plain,start+until,valid?'ja':'unknown',valid?converted:part,valid?'かなとして読める区間':'判断を保留',!valid||part.length<4);
    };
    while(cursor<raw.length) {
      // A split must start after a complete kana-reading prefix, never inside a syllable.
      const boundary=cursor===0||complete(raw.slice(plain,cursor));
      let found=boundary ? entries.find(e=>lower.startsWith(e.raw.toLowerCase(),cursor)) : null;
      let length=found?.raw.length ?? 0, output=found?.value, language='dictionary', reason='ユーザー辞書';
      if (!found && boundary) {
        const word=terms.find(w=>lower.startsWith(w,cursor) &&
          (protectedWords.has(w)||!complete(w)));
        if (word) { length=word.length; output=raw.slice(cursor,cursor+length); language='en'; reason='混在文の英語区間'; found=true; }
      }
      if (found) {
        flush(cursor); add(start+cursor,start+cursor+length,language,output,reason);
        cursor+=length; plain=cursor;
      } else cursor++;
    }
    flush(raw.length);
  }
  return segments;
}
export function compose(segments, overrides = {}) {
  return segments.map((s,i) => overrides[i]?.text ?? s.text).join('');
}
