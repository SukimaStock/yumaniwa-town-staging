// All views share these world coordinates. Projection changes representation only.
export const town = Object.freeze({
  you: Object.freeze({x:190,y:430}),
  station: Object.freeze({id:'station',name:'いつもの駅',x:120,y:370,w:76,d:38,h:28}),
  park: Object.freeze({id:'park',name:'いつもの公園',x:275,y:280,w:108,d:75}),
  tower: Object.freeze({id:'tower',name:'遠くの塔',x:435,y:100,w:22,d:20,h:72}),
  road: Object.freeze({y:205,left:55,right:540,width:27}),
  shops: Object.freeze([
    Object.freeze({id:'cafe',name:'木陰の喫茶',x:295,y:150,w:42,d:30,h:22,relation:'いつもの公園の向こう。大通りを越えたところ。'}),
    Object.freeze({id:'bread',name:'橋のパン屋',x:475,y:270,w:46,d:30,h:24,relation:'公園の右側。大通りの手前、川に近いところ。'}),
    Object.freeze({id:'books',name:'駅裏の本屋',x:110,y:465,w:42,d:28,h:24,relation:'いつもの駅の裏手。公園よりも、YOUに近いところ。'})
  ])
});
export function project(x,y,mini=false,overhead=false,z=0){
  if(!mini || overhead) return {x,y};
  return {x:x+(y-280)*.15,y:280+(y-280)*.68-z};
}
export function boundedCamera(scale,x,y){
  const s=Math.max(.85,Math.min(2.4,scale));
  const margin=60+(s-1)*280;
  return {scale:s,x:Math.max(-margin,Math.min(margin,x)),y:Math.max(-margin,Math.min(margin,y))};
}
