// Work-local identity and presentation only. No price, demand or quality calculations.
export const IDENTITY_BOTTLES=Object.freeze([{id:'round',shape:'standard',name:'丸ビン'},{id:'square',shape:'square',name:'角ビン'},{id:'slender',shape:'tall',name:'細ビン'},{id:'fancy',shape:'fancy',name:'丸胴ビン'}].map(Object.freeze));
export const IDENTITY_LABELS=Object.freeze([{id:'cream',name:'ホワイト',color:'#d9cba4',detail:'#786343'},{id:'dark',name:'ブラック',color:'#303e3a',detail:'#d5c098'}].map(Object.freeze));
export const CAP_COLORS=Object.freeze({low:'#c8c8dc',standard:'#b87333',high:'#ffc832'});
export const brandIdentityMode=s=>s?.brandIdentity?.version===1;
export const needsBrandSetup=s=>brandIdentityMode(s)&&!s.brandIdentity.configured;
export const identityDefaults=()=>({name:'AmberTime',bottle:'round',label:'cream'});
export function brandNameError(name){return typeof name!=='string'||!name.trim()?'ブランド名を入力してください。':name.trim().length>40||/[\u0000-\u001f\u007f]/.test(name)?'ブランド名は1〜40文字で入力してください。':'';}
export function checkedBrandDraft(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['name','bottle','label'].includes(k)))throw Error('ブランドの指定が不正です。');
 const draft={...identityDefaults(),...input},error=brandNameError(draft.name);if(error)throw Error(error);
 if(!IDENTITY_BOTTLES.some(x=>x.id===draft.bottle)||!IDENTITY_LABELS.some(x=>x.id===draft.label))throw Error('ビンとラベルを選んでください。');
 return {...draft,name:draft.name.trim()};
}
export const bottleShape=brand=>IDENTITY_BOTTLES.find(x=>x.id===brand?.bottle)?.shape??'standard';
// productsById retains the explicit selected tier, including sold-out/pruned products.
export function releasePriceTier(state,productId){return Object.hasOwn(CAP_COLORS,state?.productsById?.[productId]?.selectedPrice)?state.productsById[productId].selectedPrice:'standard';}
