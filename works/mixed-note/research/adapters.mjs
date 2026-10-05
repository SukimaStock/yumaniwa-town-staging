// Original observation adapter. No upstream engine implementation is copied here.
// Shared by Node and Chromium; getMatchCount is a best-path word count, NOT N-best.
export async function createJaime(module) {
  const errors=[];
  const e=(await WebAssembly.instantiate(module,{debug:{consoleLog:code=>errors.push(code)}})).exports;
  const start=performance.now(); e.init();
  const initMs=performance.now()-start;
  let text=[], cursor=0;
  const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
  const read=(ptr,len)=>decoder.decode(new Uint8Array(e.memory.buffer,ptr,len));
  function insert(ch) {
    if ([...ch].length!==1) throw new Error('Jaime accepts one codepoint per insertion');
    const b=encoder.encode(ch);
    new Uint8Array(e.memory.buffer,e.getInputBufferPointer(),b.length).set(b);
    e.insert(b.length);
    if(errors.length) throw new Error(`Jaime error codes: ${errors.join(',')}`);
    const removed=e.getDeletedCodepoints();
    const added=[...read(e.getInsertedTextPointer(),e.getInsertedTextLength())];
    if(removed>cursor) throw new Error('Deletion exceeds tracked cursor');
    text.splice(cursor-removed,removed,...added);cursor+=added.length-removed;
    return {removed,inserted:added.join('')};
  }
  function matches() {
    if(errors.length) throw new Error('No candidate access after engine error');
    const count=e.getMatchCount();
    if(count>4096) throw new Error('Invalid word count');
    return Array.from({length:count},(_,i)=>{
      const len=e.getMatchTextLength(i);
      if(len>4096) throw new Error('Match exceeds upstream static buffer');
      const value=read(e.getMatchText(i),len);
      if(/[\u0000-\u0008\u000b-\u001f\ufffd]/u.test(value)) throw new Error('Corrupt candidate');
      return value;
    });
  }
  return {insert,matches,get text(){return text.join('');},get cursor(){return cursor;},errors,initMs,
    memoryBytes:e.memory.buffer.byteLength,
    back(){e.deleteBack();if(cursor) {text.splice(--cursor,1);}},
    forwardDelete(){e.deleteForward();text.splice(cursor,1);},
    move(delta){if(delta<0)e.moveCursorBack(-delta);else e.moveCursorForward(delta);cursor=Math.max(0,Math.min(text.length,cursor+delta));}
  };
}
export async function observeJaime(module,input) {
  const ime=await createJaime(module), start=performance.now();let skipped=[], failedAt=null;
  try {
    for(const [index,ch] of [...input].entries()){
      failedAt=index;const r=ime.insert(ch);if(!r.removed&&!r.inserted)skipped.push({index,char:ch});
    }
    const words=ime.matches();
    return {status:'observed',kana:ime.text,words,output:words.join(''),skipped,errors:ime.errors,
      initMs:ime.initMs,conversionMs:performance.now()-start,memoryBytes:ime.memoryBytes};
  }catch(error){return {status:'engine-failed',failedAt,partialKana:ime.text,output:null,skipped,errors:ime.errors,error:String(error),initMs:ime.initMs,conversionMs:performance.now()-start,memoryBytes:ime.memoryBytes};}
}
export function prepareJapanese(raw,toHiragana) {
  // Only human-labelled JA spans. Whitespace/punctuation normalization is NOT Detection.
  const compact=raw.replace(/\s+/gu,'');
  // Transliterate ASCII runs before adding Japanese punctuation. toHiragana leaves
  // mixed romaji + Japanese-script input unchanged; passing it 。 first is invalid.
  return compact.replace(/[a-z'-]+/giu, run=>toHiragana(run,{IMEMode:true}).replace(/n$/u,'ん'))
    .replaceAll('.', '。').replaceAll(',', '、');
}
export function observeMozc(module,kana) {
  const start=performance.now();
  const result=JSON.parse(module.ccall('hechima_convert','string',['string','number'],[kana,10]));
  if(!Array.isArray(result.segments)||!result.segments.length)throw new Error('No Mozc segments');
  for(const s of result.segments)if(!s.key||!s.candidates?.length)throw new Error('Malformed Mozc segment');
  return {kana,segments:result.segments,output:result.segments.map(s=>s.candidates[0]).join(''),conversionMs:performance.now()-start};
}
export function evaluatePath(parts,target) {
  const output=parts.map(p=>p.output??'').join('');
  // Availability in independently selectable segments; no oracle-ranked output is displayed.
  let offsets=new Set([0]);
  for(const part of parts)for(const choices of (part.segments?.map(s=>s.candidates)??[[part.output]])) {
    const next=new Set();
    for(const offset of offsets)for(const choice of choices)if(typeof choice==='string'&&target.startsWith(choice,offset))next.add(offset+choice.length);
    offsets=next;
  }
  return {output,top1Exact:output===target,targetSelectable:offsets.has(target.length)};
}
