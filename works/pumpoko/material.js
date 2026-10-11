(function(root){
  const material = Object.freeze({
    rindLight: '#738665', rind: '#536c4d', rindDeep: '#3e5942',
    fleshLight: '#ffda96', flesh: '#efb666', fleshDeep: '#cf924e',
    cream: '#fff4d9', seedLight: '#fff9e5', seed: '#f2e2b9', seedDeep: '#d6bc89',
    air: '#faf1dc', airDeep: '#efdfba', far: '#e5e7ce', near: '#ecddba',
    leaf: '#738b59', leafDeep: '#536f49', shadow: 'rgba(90,68,38,.13)'
  });
  root.PumpokoMaterial=material;
})(typeof window!=='undefined'?window:globalThis);
