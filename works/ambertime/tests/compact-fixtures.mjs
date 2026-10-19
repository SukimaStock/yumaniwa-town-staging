// All browser states are constructed with public game operations, never patched balances/profiles.
export async function compactFixture(kind='tasting') {
 const D=await import('../partner-orders.mjs'),B=await import('./brands-helpers.mjs');
 let s=D.newStaffDistillery(42);
 if(kind==='legacy')s=B.advance(B.fill(D.newRecipeDistillery(42),{progress:65,type:'refill'}),1);
 else if(kind==='full'){for(let i=0;i<4;i++){s=B.fill(s,{progress:35+i*15,type:'refill'});s=B.advance(s,1);}}
 else if(kind==='bottle'){s=B.advance(B.fill(s,{progress:65,type:'refill'}),6);s=D.bottleBranded(s,s.core.casks[0].id,{name:'川霧と夜明けを待つ蒸留所の長い銘柄名'});}
 else if(kind==='rich'||kind==='generation'||kind==='destination'){
  const G=await import('./generation-helpers.mjs'),H=await import('./department-helpers.mjs');
  if(kind==='destination'){s=D.enableStaff(D.enableRecipeBook(D.enableGenerations(D.enableBottleStorage(H.interested()))));}
  else if(kind==='generation'){s=G.generationAtMonth(360);s=D.noticeGeneration(s,s.generations.active.id);s=D.startDistillation(s);s=G.finishExtraction(s,40,'refill');s=D.handoverGeneration(s,s.generations.active.id);s=D.enableStaff(D.enableRecipeBook(s));}
  else {s=D.enableStaff(D.enableRecipeBook(D.enableGenerations(D.enableBottleStorage(H.interested()))));for(let i=0;i<15;i++){s=B.release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});s=B.advance(s,6);}for(let i=0;i<6;i++){s=B.fill(s,{progress:35+i*5,type:i%2?'bourbon':'refill'});s=B.advance(s,1);s=D.saveRecipe(s,s.core.casks.at(-1).id,'残した製法 '+i);s=D.bottleBranded(s,s.core.casks.at(-1).id,{name:'小さな棚の長い銘柄 '+i});}for(let i=0;i<1;i++){s=B.fill(s,{progress:35+i*10,type:'refill'});s=B.advance(s,1);s=D.saveRecipe(s,s.core.casks.at(-1).id,'残した製法 '+i);}}
 } else if(kind==='ready'){s=B.advance(B.fill(s,{progress:65,type:'refill'}),1);}
 else {s=B.advance(B.fill(s,{progress:85,type:'bourbon'}),1);s=B.fill(s,{progress:65,type:'refill'});s=B.advance(s,6);s=D.bottleBranded(s,s.core.casks.at(-1).id,{name:'川霧'});s=D.setSalePrice(s,'low',s.result.productId);s=D.listBottles(s,s.result.productId);s=B.advance(s,17);s=D.sampleDistillery(s,s.core.casks[0].id);s=D.endTasting(s);s=B.advance(s,48);s=B.fill(s,{progress:35,type:'refill'});}
 D.restoreDistillery(D.serializeDistillery(s));return JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0});
}
