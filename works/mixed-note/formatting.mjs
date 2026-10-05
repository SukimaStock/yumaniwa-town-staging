// Presentation only: never mutate conversion spans, readings, raw offsets or candidates.
const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー]/u;
const word = /[\p{L}\p{N}]/u;
const horizontal = /[\t \u3000]/u;
const marks = {',':'、','.':'。','?':'？','!':'！'};
const sentenceEnd = /[.?!。？！\r\n]/u;
const japaneseMark = /[、。？！]/u;
const literals = () => /https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|`[^`\r\n]*`|\d+(?:[.,]\d+)+/gu;

export function formatParts(segments, overrides = {}) {
  const parts = segments.map((s,i) => overrides[i]?.text ?? s.text);
  // Some protected literals (e.g. a www URL path) can already be split by
  // detection. Restore their untouched source pieces in this final layer.
  // Explicit surface edits still win; the engine and its candidates stay intact.
  if (segments.every(s=>typeof s.raw==='string')) {
    const source=segments.map(s=>s.raw).join('');
    const ranges=[...source.matchAll(literals())].map(m=>[m.index,m.index+m[0].length]);
    let at=0;
    segments.forEach((s,i)=>{
      const end=at+s.raw.length;
      if (!overrides[i] && ranges.some(([a,b])=>a<=at && end<=b)) parts[i]=s.raw;
      at=end;
    });
  }
  const chars = [], owners = [];
  parts.forEach((text,i) => { for (const c of text) { chars.push(c); owners.push(i); } });
  const text = chars.join(''), protectedChars = new Set();
  // Protect across segment boundaries as well, including a user-selected surface.
  const pattern = literals();
  for (const m of text.matchAll(pattern)) {
    const start = [...text.slice(0,m.index)].length;
    for (let i=start;i<start+[...m[0]].length;i++) protectedChars.add(i);
  }
  // Read neighbouring word runs within a clause. Two English words mark an
  // English phrase; a single name/word beside Japanese belongs to that context.
  function context(at, direction) {
    let englishWords=0, inWord=false;
    for (let i=at+direction;i>=0&&i<chars.length;i+=direction) {
      const c=chars[i];
      if (protectedChars.has(i)) {
        if (!inWord && ++englishWords>=2) return false;
        while (protectedChars.has(i+direction)) i+=direction;
        inWord=true;
        continue;
      }
      if (sentenceEnd.test(c)) break;
      if (japanese.test(c)) return true;
      if (word.test(c)) {
        if (!inWord && ++englishWords>=2) return false;
        inWord=true;
      } else inWord=false;
    }
    return null;
  }
  for (let i=0;i<chars.length;i++) {
    if (!marks[chars[i]] || protectedChars.has(i)) continue;
    const left=context(i,-1);
    if (left===true || (left===null && context(i,1)===true)) chars[i]=marks[chars[i]];
  }
  // Remove inline gaps touching Japanese. Never collapse English word gaps,
  // whitespace inside protected literals, indentation, or paragraph breaks.
  for (let i=0;i<chars.length;) {
    if (!horizontal.test(chars[i])) { i++; continue; }
    let end=i+1;
    while (end<chars.length && horizontal.test(chars[end])) end++;
    const left=chars[i-1],right=chars[end];
    if (left && right && !/[\r\n]/.test(left+right)
      && (japanese.test(left+right)||japaneseMark.test(left+right))
      && !Array.from({length:end-i},(_,n)=>i+n).some(n=>protectedChars.has(n))) {
      for (let n=i;n<end;n++) chars[n]='';
    }
    i=end;
  }
  const formatted=parts.map(()=> '');
  chars.forEach((c,i)=>{formatted[owners[i]]+=c;});
  return formatted;
}
export const formatText = (segments,overrides) => formatParts(segments,overrides).join('');
