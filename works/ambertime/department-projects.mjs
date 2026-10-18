import {bottleStorageMode} from './bottle-storage.mjs?v=0.18';
// A selection is finite; interest never reserves stock or requires production.
export const DEPARTMENT=Object.freeze({version:14,rules:'department-limited-selection',projectId:'department-select-whisky',projectName:'特選ウイスキー',quantity:5});
export const departmentMode=s=>s?.version===DEPARTMENT.version&&s.rules===DEPARTMENT.rules||bottleStorageMode(s);
export const departmentInterests=(s,brandId)=> (s.department?.interests??[]).filter(x=>brandId===undefined||x.brandId===brandId);
export const departmentAdoptions=(s,brandId)=> (s.department?.adoptions??[]).filter(x=>brandId===undefined||x.brandId===brandId);
export function departmentReleaseEligible(r){return !!r&&r.age>=24&&r.profile?.roughness<=.30;}
export function departmentUsedRelease(s,id){return (s.shop?.deliveries??[]).some(d=>d.shopId==='department'&&d.releaseId===id);}
export function departmentSource(s,brandId){
 return [...(s.releases??[])].reverse().find(r=>r.brandId===brandId&&(bottleStorageMode(s)||r.listed)&&departmentReleaseEligible(r)&&!departmentUsedRelease(s,r.id)&&!s.department.seenSources.includes(r.id));
}
export function departmentSelection(s,brandId,offered=false){
 if(offered)return s.shop?.offer?.shopId==='department'&&s.shop.offer.brandId===brandId?s.shop.offer:null;
 return departmentInterests(s,brandId)[0]??null;
}
export function departmentStatus(s,productId){
 const release=s.releases?.find(r=>r.productId===productId);if(!release)return null;
 const adoption=departmentAdoptions(s,release.brandId).find(a=>a.releaseId===release.id);
 const offer=departmentSelection(s,release.brandId,true),interest=departmentSelection(s,release.brandId);
 return {status:adoption?'completed':offer?'offer':interest?'interest':departmentAdoptions(s,release.brandId).length?'history':'none',offer,interest,adoption};
}
