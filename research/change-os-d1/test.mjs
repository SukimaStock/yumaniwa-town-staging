import assert from 'node:assert/strict';
import {classify} from './classify.mjs';
const base={trustedFacts:true,baseIsAncestor:true,exactHead:true,changesProduction:false,
  changesRelease:false,touchesSharedRuntime:false,touchesPersistence:false,touchesGameRules:false,
  dependenciesReviewed:true,relevantTestsIdentified:true,activeWorkAtBase:true,singleWorkOnly:true,
  diffSemanticsReviewed:true,noExternalSideEffects:true,noContractChange:true};
const f=(path,status='modified',addedText='const color = "#ddd";')=>({path,status,addedText});
const lab={...base,files:[f('works/postcard-generator/review-world/index.html','added')],
  isolatedLab:true,labEntryWasAbsentAtBase:true,labDirectory:'review-world',
  noExistingEntryPointModified:true,noRuntimeReachability:true};
const cases=[
 ['PR #821 nested research Lab',lab,'A','ISOLATED_NESTED_LAB_CANDIDATE'],
 ['AmberTime visual local edit',{...base,files:[f('works/ambertime/style.css')]},'B','SCOPED_ACTIVE_WORK_CANDIDATE'],
 ['game calculation changed',{...base,touchesGameRules:true,files:[f('works/ambertime/game.mjs')]},'C','CONTRACT_OR_GAME_RULE'],
 ['save format changed',{...base,touchesPersistence:true,files:[f('works/ambertime/save.mjs')]},'C','CONTRACT_OR_GAME_RULE'],
 ['shared Engine',{...base,files:[f('tools/shared-engine.cjs')]},'C','PROTECTED_PATH'],
 ['hidden storage in lab',{...lab,files:[f('works/postcard-generator/review-world/index.html','added','localStorage.setItem("x","y")')]},'C','CONTRACT_SIGNAL_OR_UNKNOWN_CONTENT'],
 ['Change OS modification',{...base,files:[f('tools/staging-isolation-fastpath.cjs')]},'C','PROTECTED_PATH'],
 ['unreviewed old base',{...lab,baseIsAncestor:false},'C','UNVERIFIED_GIT_RELATION'],
 ['production promotion',{...lab,changesProduction:true},'C','RELEASE_BOUNDARY'],
 ['multiple works',{...base,files:[f('works/ambertime/style.css'),f('works/postcard-generator/style.css')]},'C','MULTI_WORK_OR_OUT_OF_WORK'],
 ['untrusted evidence',{...lab,trustedFacts:false},'C','UNTRUSTED_FACTS'],
 ['new lab referenced by existing app',{...lab,noRuntimeReachability:false},'C','NOT_PROVEN_ISOLATED'],
 ['readiness unknown',{...lab,dependenciesReviewed:false},'C','INCOMPLETE_REVIEW']
];
let ok=0;
for (const [name,input,route,reason] of cases) {
  const result=classify(input);
  assert.equal(result.route,route,name);
  assert.equal(result.reason,reason,name);
  console.log(name+': '+result.route+' / '+result.reason);
  ok++;
}
console.log('PASS '+ok+'/'+cases.length+' research-only cases');
