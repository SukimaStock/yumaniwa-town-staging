import { AROMAS, aromaSelection } from './model.mjs';

const labels = Object.freeze({ spirit: '果実・穀物', vanilla: 'バニラ', dried: 'ドライフルーツ', woody: '木の香り' });
const validStrength = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const safeProfile = profile => Object.fromEntries(AROMAS.map(({ key }) => [key, validStrength(profile?.[key]) ? profile[key] : undefined]));

// Select the actual strongest two before considering comparison emphasis. A
// difference may change their order, never which aromas earn a picture.
export function majorAromas(profile, otherProfile = null) {
  return aromaSelection(safeProfile(profile)).slice(0, 2).map(aroma => {
    const otherValue = validStrength(otherProfile?.[aroma.key]) ? otherProfile[aroma.key] : null;
    const delta = otherValue === null ? null : aroma.value - otherValue;
    let role = 'plain', note = '';
    if (delta !== null) {
      const distance = Math.abs(delta);
      if (distance < .08 && otherValue >= .10) { role = 'shared'; note = '共通'; }
      else if (distance < .10) { role = 'close'; note = '近い強さ'; }
      else if (delta >= .10) { role = 'more'; note = otherValue === 0 ? 'こちらの特徴' : '強め'; }
      else { role = 'less'; note = '控えめ'; }
    }
    return { key: aroma.key, label: labels[aroma.key], value: aroma.value, role, otherValue, delta, note };
  }).sort((a, b) => Number(['more', 'less'].includes(b.role)) - Number(['more', 'less'].includes(a.role)));
}

// Two-picture omission is not absence or necessarily a faint aroma. Detail
// views retain every other nonzero channel at its unchanged strength.
export function omittedAromas(profile) {
  const selected = new Set(majorAromas(profile).map(aroma => aroma.key));
  return AROMAS.filter(({ key }) => !selected.has(key) && validStrength(profile?.[key]) && profile[key] > 0)
    .map(({ key }) => ({ key, label: labels[key], value: profile[key] }));
}

export function severeState(profile) {
  const cues = [];
  if (validStrength(profile?.roughness) && profile.roughness > .45) cues.push('刺激が強い');
  if (validStrength(profile?.wood) && profile.wood > .65) cues.push('木の苦みが強い');
  return cues;
}

const tendencies = Object.freeze({
  bourbon: Object.freeze({ key: 'vanilla', label: 'バニラ', phrase: '加わりやすい香り' }),
  sherry: Object.freeze({ key: 'dried', label: 'ドライフルーツ', phrase: '加わりやすい香り' }),
  refill: Object.freeze({ key: 'spirit', label: '原酒を生かす', phrase: '樽の影響は穏やか' }),
});
export function caskTendency(id) {
  return tendencies[id] ?? null;
}
