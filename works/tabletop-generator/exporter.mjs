export function svgBlob(svg){return new Blob([svg],{type:'image/svg+xml;charset=utf-8'});}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function pngBlob(svg,width=900,height=720){
 const url=URL.createObjectURL(svgBlob(svg));
 try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('SVGを画像へ変換できませんでした'));image.src=url;});
 const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');if(!ctx)throw Error('PNG保存に対応していません');ctx.drawImage(image,0,0,canvas.width,canvas.height);
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNGを作成できませんでした')),'image/png'));
 }finally{URL.revokeObjectURL(url);}
}
