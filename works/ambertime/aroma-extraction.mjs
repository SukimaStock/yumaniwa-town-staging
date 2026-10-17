// Frozen Phase 2 hypothesis A. Aroma is the volume-weighted collected spirit,
// not the instantaneous fraction; no random draws or player-state mutations.
import {previewDistillation} from './model.mjs?v=0.6-parallel';
import {PARALLEL_PARAMETERS as P} from './economy-parameters.mjs';
export const AROMA_MODEL='aroma-a/1';
// Fixed IEEE-754 coefficients for the discrete legal positions 30..99.
// This freezes the adopted reference rather than re-evaluating Math.exp, whose
// final bits can differ between JS engines and break exact operation replay.
// Source: experiments/distillation/models.mjs, SHA-256
// f321c7fd03a5012934b974853cf67a5bf6cefb556ee8a89bdc3523e9cdeb5e26.
// Original equation, unchanged: initial mass = 24 L * .24; for each integer
// interval p=30..position-1, use 16 midpoint samples with
// x=(p-30+(j+.5)/16)/70 and fraction=.10+3*exp(-((x-.28)/.18)^2).
// Add fraction * (rounded V(p+1)-rounded V(p))/16 to the mass, then divide
// by rounded V(position), where V is the existing previewDistillation litres.
// Tests compare every coefficient and all 8 seeds x 70 public stop results
// bit-for-bit with the frozen reference. No curve or parameter is adjusted.
const characters=Object.freeze([
 0.24,0.24153761272245922,0.24379520654155287,0.24689214728559322,0.2507781044522131,
 0.2559326517570913,0.2622996640236821,0.26999161696252466,0.27910482527728775,0.28971268642462644,
 0.3018590576243698,0.31496181522406824,0.33018033445843253,0.3468376561405771,0.3648122342342936,
 0.38393792183182196,0.40400712404365846,0.42477629506612663,0.4450591598055607,0.46640866910291967,
 0.4875959990097896,0.508324692529427,0.5283121596260641,0.5472999339470044,0.5650625158057587,
 0.5807086202827436,0.5955189497845169,0.6086825621295497,0.6201519679841655,0.6299240555219011,
 0.6380358761791423,0.6445589888561252,0.6493755250662369,0.6530431741670437,0.6554755069175363,
 0.6568137883583808,0.6572005080891453,0.6567744056621123,0.6556665523730938,0.654069594763407,
 0.6519464753880664,0.6494653593201656,0.6467079688871332,0.6437431621089854,0.6406278483741649,
 0.6374081859520407,0.6342629396771338,0.6309349124945707,0.6275900743338857,0.6242450147078811,
 0.6209119654844786,0.6175997459703776,0.6143145536472615,0.6112012228376328,0.6079795063799178,
 0.6047935190555788,0.6016441941294846,0.5985319334060455,0.5954567742610636,0.5924185097983159,
 0.5895465225789159,0.5865792797637104,0.5836475993320293,0.58075091962137,0.5778886628866139,
 0.5750602465975101,0.5722650905302334,0.5696220562758316,0.5668903237894909,0.564190183658403
]);
export function aromaPreview(progress){
 if(!Number.isInteger(progress)||progress<P.minimumStop||progress>=P.distillMax)throw Error('抽出位置が不正です。');
 return {...previewDistillation((progress-P.minimumStop)/(P.distillMax-P.minimumStop)),character:characters[progress-P.minimumStop]};
}
export function previewForDistillation(d){
 if(d?.model===AROMA_MODEL)return aromaPreview(d.progress);
 return previewDistillation((d.progress-P.minimumStop)/(P.distillMax-P.minimumStop));
}
