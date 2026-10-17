'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readWorks,readWorkSearchMeta}=require('../tools/release-validator.cjs');
const {buildPage}=require('../tools/generate-work-search-pages.cjs');
const root=require('node:path').resolve(__dirname,'..');
const metadata=readWorkSearchMeta(root);
const keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
function probe(markup,href,fire=true) {
  const anchors=[...markup.matchAll(/<a[^>]*href="([^"]+)"/g)].map(m=>({value:m[1],getAttribute(){return this.value;},setAttribute(k,v){this.value=v;}}));
  const callbacks=[]; const redirected=[];
  const url=new URL(href);
  const context={URL,URLSearchParams,document:{addEventListener(name,cb){assert.equal(name,'DOMContentLoaded');callbacks.push(cb);},querySelectorAll(selector){assert.equal(selector,'.actions a, .language a');return anchors;}},window:{location:{href,search:url.search,hash:url.hash,replace(v){redirected.push(new URL(v,href));}}}};
  for(const m of markup.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInNewContext(m[1],context);
  if(fire)callbacks.forEach(cb=>cb());
  return {links:anchors.map(a=>new URL(a.value,href)),raw:anchors.map(a=>a.value),redirected};
}
for (const work of readWorks(root).filter(w=>metadata[w.id])) for(const locale of ['ja','en']) {
  const markup=buildPage(work.id,work,metadata[work.id],locale,'staging');
  const href='https://sukimastock.github.io/yumaniwa-town-staging/'+(locale==='en'?'en/':'')+'w/'+work.id+'/';
  test(`${work.id} ${locale}: existing destinations retain campaign without routing overrides`,()=>{
    const input='?utm_source=threads&utm_medium=social&utm_campaign=%E9%9B%A8+%26+%E7%AA%93&utm_content=clip&utm_term=quiet&utm_source=other&work=evil&place=evil&open=0&private=secret#wrong';
    const result=probe(markup,href+input);
    const base=probe(markup,href);
    assert.equal(result.redirected.length,0);
    for(let i=0;i<3;i++) {
      assert.equal(result.links[i].pathname,base.links[i].pathname);
      assert.equal(result.links[i].searchParams.get('work'),i===0?work.id:null);
      for(const key of keys)assert.equal(result.links[i].searchParams.get(key),new URL(href+input).searchParams.get(key));
      for(const key of ['open','place','private'])assert.equal(result.links[i].searchParams.has(key),false);
      assert.equal(result.links[i].hash,'');
    }
  });
  test(`${work.id} ${locale}: no campaign and JavaScript-free fallback stay unchanged`,()=>{
    assert.deepEqual(probe(markup,href+'?utm_source=&work=evil').raw,probe(markup,href,false).raw);
  });
  test(`${work.id} ${locale}: open shortcut preserves existing fixed work behavior`,()=>{
    const result=probe(markup,href+'?open=1&work=evil&work=other&utm_source=note#chapter',false);
    assert.equal(result.redirected.length,1);
    const target=result.redirected[0];
    assert.deepEqual(target.searchParams.getAll('work'),[work.id]);
    assert.equal(target.searchParams.has('open'),false);
    assert.equal(target.searchParams.get('utm_source'),'note');
    assert.equal(target.hash,'#chapter');
  });
}
