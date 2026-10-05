import {createJaime,observeJaime,prepareJapanese,observeMozc,evaluatePath} from './adapters.mjs';
export async function evaluate(fixtures,jaime,mozc,toHiragana,baseline) {
  const cases=[];
  for(const f of fixtures.cases) {
    if(f.spans.map(s=>s[1]).join('')!==f.input)throw new Error(`Lossy fixture: ${f.id}`);
    const raw=await observeJaime(jaime,f.input);
    const jaimeParts=[],mozcParts=[];
    for(const [kind,raw] of f.spans){
      if(kind!=='ja'){jaimeParts.push({kind,raw,output:raw});mozcParts.push({kind,raw,output:raw});continue;}
      const compact=raw.replace(/\s+/gu,'');
      jaimeParts.push({kind,raw,...await observeJaime(jaime,compact)});
      const kana=prepareJapanese(raw,toHiragana);
      mozcParts.push({kind,raw,...observeMozc(mozc,kana)});
    }
    cases.push({id:f.id,input:f.input,target:f.target,mandatory:!!f.mandatory,
      baseline:baseline(f.input),jaimeRaw:raw,
      jaimeOracle:{parts:jaimeParts,...evaluatePath(jaimeParts,f.target)},
      mozcOracle:{parts:mozcParts,...evaluatePath(mozcParts,f.target)}});
  }
  const composition=[];
  for(const f of fixtures.composition){const r=await observeJaime(jaime,f.input);composition.push({...f,actual:r.kana??r.partialKana,pass:r.kana===f.target,errors:r.errors});}
  const edits=[];
  for(const operation of ['backspace','cursor-insert','forward-delete']){
    const ime=await createJaime(jaime);for(const ch of 'kana')ime.insert(ch);
    if(operation==='backspace'){ime.back();ime.insert('m');ime.insert('i');}
    if(operation==='cursor-insert'){ime.move(-1);ime.insert('m');ime.insert('i');}
    if(operation==='forward-delete'){ime.move(-1);ime.forwardDelete();}
    const target=operation==='backspace'?'かみ':operation==='cursor-insert'?'かみな':'か';
    edits.push({operation,target,actual:ime.text,pass:ime.text===target,candidate:ime.matches().join(''),errors:ime.errors});
  }
  const stability=await observeJaime(jaime,'kyouhatukareta'.repeat(10));
  return {stability:{input:'kyouhatukareta'.repeat(10),...stability},schema:'mixed-note-engine-results/1',boundaryMode:fixtures.boundaryMode,
    automaticDetection:'NOT_IMPLEMENTED',physicalIphoneSafari:'UNVERIFIED',
    integrationEligible:false,reason:'Human-labelled spans are not automatic mixed-language detection; physical iPhone writing quality has not passed.',cases,composition,edits};
}
