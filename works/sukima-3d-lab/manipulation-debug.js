// Temporary author tuning, never normal-view controls or saved source data.
export function createManipulationPanel(player,input,host,onChange){
 const panel=document.createElement('div');panel.className='debug';
 const select=document.createElement('select');select.setAttribute('aria-label','調整するパーツ');
 for(const c of player.controls){const option=document.createElement('option');option.value=c.part;option.textContent=`${c.part} / ${c.type.toUpperCase()}`;select.append(option);}
 panel.append(select);const fields=document.createElement('div'),output=document.createElement('output');panel.append(fields,output);host.append(panel);
 function rebuild(){
  fields.replaceChildren();const c=player.control(select.value);
  const settings=[['sensitivity','感度',.25,2,.05],...(c.type==='rotate'?[['inertia','慣性',0,1,.05],['damping','減衰',2,18,.5]]:[['min','下限',c.type==='hinge'?-Math.PI:-1,c.type==='hinge'?Math.PI:1,.05],['max','上限',c.type==='hinge'?-Math.PI:-1,c.type==='hinge'?Math.PI:1,.05]])];
  for(const [key,text,min,max,step] of settings){
   const label=document.createElement('label'),name=document.createElement('span'),field=document.createElement('input');name.textContent=text;field.type='number';field.min=min;field.max=max;field.step=step;field.value=c[key];field.setAttribute('aria-label',text);
   field.addEventListener('change',()=>{input.cancel();const value=Number(field.value);const ok=key==='min'||key==='max'?player.setRange(c.part,key==='min'?value:c.min,key==='max'?value:c.max):player.setOption(c.part,key,value);field.value=c[key];if(ok)onChange();update();});label.append(name,field);fields.append(label);
  }
 }
 function update(){const c=player.control(select.value);output.textContent=`part: ${player.active??'—'} / ${c.part}\nmode: ${input.pointer?.mode??'idle'} / ${c.type}\nvalue: ${c.value.toFixed(4)} ${c.type==='linear'?'units':'rad'}\nrange: ${c.type==='rotate'?'continuous':`${c.min.toFixed(3)} … ${c.max.toFixed(3)}`}\nvelocity: ${c.velocity.toFixed(3)}`;}
 select.addEventListener('change',()=>{input.cancel();rebuild();update();});rebuild();update();return {update};
}
