// Independent retention projection. Never installed as the native collector's source.
import {memoryCatalog,recallWine,selectImportantWines} from '../memory.mjs';
import {canonical} from '../model.mjs';
const copy=structuredClone;
export function buildMemory(source,options={}){
 const memory=memoryCatalog(source,{...options,policy:'C'}),traits={},signatures=new Map();
 for(const row of memory.catalog){
  const release=source.releases.find(r=>r.id===row.id);
  // Traits may be shared; provenance, brand, price and release identity stay on each row.
  const value={age:release.age,profile:copy(release.profile??null)},signature=canonical(value);
  let id=signatures.get(signature);if(!id){id='trait:'+ (signatures.size+1);signatures.set(signature,id);traits[id]=value;}
  row.traitId=id;row.price=release.price??null;
  row.summary={bottles:release.bottles??null,retailSold:release.sold??null,retailRevenue:release.revenue??null};
 }
 return {...memory,version:'stage5-memory/1',traits,reasons:selectImportantWines(source),limits:[...memory.limits,'風味を追加保持するため従来C案より大きい。製法・全納品・因果関係は復元しない。','同特性でも発売ID・ブランド・価格・出自・在庫を統合しない。']};
}
export function remember(memory,id){
 const wine=recallWine(memory,id);if(wine.status==='missing')return wine;
 const trait=memory.traits[wine.traitId];
 return {...wine,trait:copy(trait),coverage:{...wine.coverage,flavor:trait?.profile!=null,collector:false,transactions:false},stock:null};
}
