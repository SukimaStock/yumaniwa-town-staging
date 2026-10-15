import {CHARACTER_PARAMETERS as C} from './character.mjs?v=0.6';
// Presentation only: saved samples and the underlying tasting model stay unchanged.
const phrases=new Map([
 ['舌に強い刺激が残る','強い刺激'],['口当たりにまだ角がある','まだ角がある'],['刺激がほどけ、丸さが出てきた','丸さが出てきた'],['やわらかい口当たり','やわらかい'],
 ['熟した果実と厚い穀物の香り','熟した果実と穀物'],['果実と穀物の香りが広がる','果実と穀物'],['軽い果実、穀物の香り','軽い果実と穀物'],['香りは控えめ','控えめ'],
 ['乾いた木の苦みが余韻を覆う','乾いた木の苦み'],['木の渋みが長く残る','木の渋み'],['バニラと木の香りが重なる','バニラと木'],['ほのかにバニラを感じる','ほのかなバニラ'],['木の香りはまだ淡い','淡い木の香り']
]);
export const shortTaste=sample=>(sample?.text??[]).map(t=>phrases.get(t)??t);
export function shortChange(current,previous){
 if(!previous)return '初めての試飲';
 const a=previous.profile,b=current.profile,changes=[];
 // Keep losses visible too; do not select only the most flattering change.
 if(a.character-b.character>C.comparisonAroma)changes.push('香りが落ち着いた');
 if(b.wood-a.wood>C.comparisonWood)changes.push('木の余韻が増した');
 if(a.roughness-b.roughness>C.comparisonRough)changes.push('刺激がやわらいだ');
 if(b.character-a.character>C.comparisonAroma)changes.push('香りがふくらんだ');
 return changes.length?changes.join(' · '):'味わいの変化はわずか';
}
