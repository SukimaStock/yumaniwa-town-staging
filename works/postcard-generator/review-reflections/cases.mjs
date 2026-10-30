// Six palettes × three densities × two passes; all three color modes and four contours.
export const cases=Array.from({length:36},(_,i)=>({
 seed:'reflection-'+String(i+1).padStart(3,'0'),
 settings:{version:'0.2',scene:'waterfront',palette:['harbor','apricot','garden','clay','blue','rose'][i%6],density:['open','normal','dense'][Math.floor(i/6)%3],colorMode:['varied','tonal','accent'][(Math.floor(i/6)+Math.floor(i/18))%3],composition:['hill','valley','slope','twin'][i%4],roofs:'auto',windows:'auto',facade:'auto',sky:'auto',groundFloor:'auto',accents:'auto',corners:'plain'}
}));
export const modes=[['plain','なし'],['short','短め'],['varied','長短']];
