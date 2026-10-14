import {newGame,distill,fillCask,advanceMonth} from './model.mjs';
// A real, paid opening batch. Existing saves never pass through this function.
export function createOpening(seed=20261014) {
  let state=fillCask(distill(newGame(seed),0.65),'bourbon');
  for(let month=0;month<8;month++) state=advanceMonth(state);
  return state;
}
