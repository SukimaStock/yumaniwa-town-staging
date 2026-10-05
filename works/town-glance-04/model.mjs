// Clockwise quarter-turns in a fixed world; never shown as cardinal directions.
export const DIRECTIONS = ['前', '右', '後ろ', '左'];
export const ORDERS = ['ABC','ACB','BAC','BCA','CAB','CBA'];
export const EXPOSURE_MS = 2500;
export const TURN_MS = 650;
export const mod4 = n => ((n % 4) + 4) % 4;
export const relativeDirection = (worldDirection, heading) => mod4(worldDirection - heading);
export function createTrials(order = 'ABC', mirrored = false) {
  if (!ORDERS.includes(order)) throw new Error('Invalid condition order');
  const scenarios = mirrored
    ? [{heading:1,stationRelative:0,towerRelative:1,turn:-1},{heading:3,stationRelative:3,towerRelative:0,turn:1}]
    : [{heading:0,stationRelative:0,towerRelative:3,turn:1},{heading:2,stationRelative:1,towerRelative:0,turn:-1}];
  return scenarios.flatMap((scene,block) => [...(block ? [...order].reverse().join('') : order)].map(condition => ({
    condition,scenario:block,initialHeading:scene.heading,turn:scene.turn,
    stationWorld:mod4(scene.heading+scene.stationRelative),towerWorld:mod4(scene.heading+scene.towerRelative),
    finalHeading:mod4(scene.heading+scene.turn),
  })));
}
export function evaluateTrial(trial, before, after) {
  const expectedBefore = relativeDirection(trial.stationWorld, trial.initialHeading);
  const expectedAfter = relativeDirection(trial.stationWorld, trial.finalHeading);
  return {expectedBefore,expectedAfter,baselineUnderstood:before===expectedBefore,
    outcome:after==='unknown'?'unknown':after===expectedAfter?'direction-match':'direction-mismatch'};
}
export function position(direction, radius=84) {
  return [{x:180,y:180-radius},{x:180+radius,y:180},{x:180,y:180+radius},{x:180-radius,y:180}][mod4(direction)];
}
