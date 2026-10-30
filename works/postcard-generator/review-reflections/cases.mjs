// Six palettes × three densities × two passes; all three color modes and four contours.
export const cases=Array.from({length:36},(_,i)=>({
 seed:'reflection-'+String(i+1).padStart(3,'0'),
 settings:{version:'0.2',scene:'waterfront',palette:['harbor','apricot','garden','clay','blue','rose'][i%6],density:['open','normal','dense'][Math.floor(i/6)%3],colorMode:['varied','tonal','accent'][(Math.floor(i/6)+Math.floor(i/18))%3],composition:['hill','valley','slope','twin'][i%4],roofs:'auto',windows:'auto',facade:'auto',sky:'auto',groundFloor:'auto',accents:'auto',corners:'plain'}
}));
// Screenshot seeds; explicit settings are comparison fixtures, not recovered screenshot URLs.
cases.push(...[
 ['12vxl8i-1pdc1i5','harbor','accent'],['1r4eir-fslvh7','garden','tonal']
].map(([seed,palette,colorMode])=>({seed,settings:{...cases[0].settings,palette,colorMode,density:'normal',composition:'auto'}})));
export const modes=[['plain','なし'],['varied','以前の長短'],['matched','建物に合わせる']];
