// Isolated trial model. Curves are readable game hypotheses, not chemical fits.
// No dependency on AmberTime's runtime, economy, random stream, or saved data.
export const MAX_BOTTLES = 64;
export const MAX_AGE = 120;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CASKS = freeze({
  bourbon: { id: 'bourbon', label: 'バーボン樽', short: 'バニラ系', detail: 'バーボン熟成に一度使ったアメリカンオーク樽' },
  sherry: { id: 'sherry', label: 'オロロソ樽', short: 'ドライフルーツ系', detail: 'ドライ・オロロソでシーズニングしたヨーロピアンオーク樽' },
  refill: { id: 'refill', label: 'リフィル樽', short: '原酒の香り', detail: 'ウイスキー熟成に繰り返し使った元バーボン樽' },
});
export const AROMAS = freeze([
  { key: 'spirit', label: '原酒の果実・穀物' },
  { key: 'vanilla', label: 'バニラ' },
  { key: 'dried', label: 'ドライフルーツ' },
  { key: 'woody', label: '木の香り' },
]);
const caskIds = Object.keys(CASKS);
const profileKeys = ['spirit', 'vanilla', 'dried', 'woody', 'wood', 'roughness', 'litres'];
const settings = freeze({
  bourbon: { spiritLoss: .010, vanilla: .78, dried: 0, aromaRise: .055, aromaFade: .0045, woody: .25, woodyRise: .022, woodyFade: .0018, wood: .0115, soften: .054, evaporation: .0025 },
  sherry: { spiritLoss: .012, vanilla: .12, dried: .84, aromaRise: .047, aromaFade: .0038, woody: .22, woodyRise: .020, woodyFade: .0016, wood: .014, soften: .045, evaporation: .0028 },
  refill: { spiritLoss: .004, vanilla: .16, dried: 0, aromaRise: .026, aromaFade: .0025, woody: .13, woodyRise: .014, woodyFade: .0012, wood: .0045, soften: .035, evaporation: .0021 },
});
function assertCask(id) {
  if (!caskIds.includes(id)) throw new TypeError('Unknown cask');
}
function assertAge(age) {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0 || age > MAX_AGE) throw new RangeError('Age must be 0–120 months');
}
export function profileAt(caskId, age) {
  assertCask(caskId);
  assertAge(age);
  const s = settings[caskId];
  const extraction = (1 - Math.exp(-s.aromaRise * age)) * Math.exp(-s.aromaFade * age);
  return freeze({
    spirit: .68 * Math.exp(-s.spiritLoss * age),
    vanilla: s.vanilla * extraction,
    dried: s.dried * extraction,
    // Wood aroma has its own extraction curve; it is not bitterness renamed.
    woody: s.woody * (1 - Math.exp(-s.woodyRise * age)) * Math.exp(-s.woodyFade * age),
    wood: 1 - Math.exp(-s.wood * age),
    roughness: .62 * Math.exp(-s.soften * age),
    litres: 32 * Math.exp(-s.evaporation * age),
  });
}
// Only actual aromas, never the wood bitterness / roughness axes. Omission is
// a display threshold, not a claim that a nonzero channel is absent.
export function aromaSelection(profile) {
  return AROMAS.map((aroma, order) => ({ ...aroma, value: profile[aroma.key], order }))
    .filter(aroma => Number.isFinite(aroma.value) && aroma.value >= .10)
    .sort((a, b) => b.value - a.value || a.order - b.order)
    .slice(0, 3).map(({ order, ...aroma }) => aroma);
}
export function newExperiment() {
  return freeze({ version: 1, nextId: 1, active: null, bottles: [], referenceId: null, delegationCount: 0 });
}
function reference(state, id = state.referenceId) {
  if (id === null) return null;
  const found = state.bottles.find(b => b.id === id);
  if (!found) throw new TypeError('Reference bottle is missing');
  return found;
}
export function startBatch(state, caskId, options = {}) {
  assertCask(caskId);
  if (!Number.isSafeInteger(state.nextId + 1)) throw new RangeError('Batch ID limit reached');
  const sourceId = options.sourceId === undefined ? state.referenceId : options.sourceId;
  reference(state, sourceId);
  const delegated = options.delegated ?? false;
  if (typeof delegated !== 'boolean') throw new TypeError('Invalid delegation');
  const active = { id: `batch-${state.nextId}`, caskId, age: 0, sourceId, delegated, profile: profileAt(caskId, 0) };
  return freeze({ ...state, nextId: state.nextId + 1, active });
}
export function advance(state, months = 6) {
  if (!state.active) throw new TypeError('No active cask');
  if (typeof months !== 'number' || !Number.isFinite(months) || months < 0) throw new RangeError('Months must be nonnegative');
  const age = Math.min(MAX_AGE, state.active.age + months);
  return freeze({ ...state, active: { ...state.active, age, profile: profileAt(state.active.caskId, age) } });
}
export function matchReference(state) {
  if (!state.active) throw new TypeError('No active cask');
  const base = reference(state);
  if (!base) throw new TypeError('No reference bottle');
  return freeze({ ...state, active: { ...state.active, age: base.age, profile: profileAt(state.active.caskId, base.age) } });
}
export function bottle(state) {
  if (!state.active) throw new TypeError('No active cask');
  if (state.bottles.length >= MAX_BOTTLES) throw new RangeError('Bottle shelf is full');
  return freeze({ ...state, bottles: [...state.bottles, { ...state.active, profile: { ...state.active.profile } }], active: null });
}
export function useBottle(state, id) {
  reference(state, id);
  if (id === null) throw new TypeError('Bottle is required');
  return freeze({ ...state, referenceId: id, active: null });
}
export function delegate(state) {
  const base = reference(state) || state.active;
  const choices = caskIds.filter(id => id !== base?.caskId);
  const caskId = choices[state.delegationCount % choices.length];
  return freeze({ ...startBatch(state, caskId, { sourceId: state.referenceId, delegated: true }), delegationCount: state.delegationCount + 1 });
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function shape(value, keys) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError('Invalid saved schema');
}
const batchKeys = ['id', 'caskId', 'age', 'sourceId', 'delegated', 'profile'];
function idNumber(id) {
  if (typeof id !== 'string' || !/^batch-[1-9]\d*$/.test(id)) throw new TypeError('Invalid batch ID');
  const n = Number(id.slice(6));
  if (!Number.isSafeInteger(n)) throw new TypeError('Invalid batch ID');
  return n;
}
function validate(state) {
  shape(state, ['version', 'nextId', 'active', 'bottles', 'referenceId', 'delegationCount']);
  if (state.version !== 1 || !Number.isSafeInteger(state.nextId) || state.nextId < 1 || !Number.isSafeInteger(state.delegationCount) || state.delegationCount < 0 || state.delegationCount >= state.nextId || !Array.isArray(state.bottles) || state.bottles.length > MAX_BOTTLES) throw new TypeError('Invalid saved state');
  const ids = new Set();
  const batches = state.active === null ? state.bottles : [...state.bottles, state.active];
  let previous = 0;
  for (const batch of batches) {
    shape(batch, batchKeys);
    const n = idNumber(batch.id);
    if (ids.has(batch.id) || n >= state.nextId || n <= previous) throw new TypeError('Invalid batch order');
    previous = n;
    if (batch.sourceId !== null && (!ids.has(batch.sourceId) || idNumber(batch.sourceId) >= n)) throw new TypeError('Invalid source reference');
    ids.add(batch.id);
    if (typeof batch.delegated !== 'boolean') throw new TypeError('Invalid saved delegation');
    const expected = profileAt(batch.caskId, batch.age);
    shape(batch.profile, profileKeys);
    if (profileKeys.some(key => typeof batch.profile[key] !== 'number' || batch.profile[key] !== expected[key])) throw new TypeError('Invalid saved flavour');
  }
  if (state.referenceId !== null && !state.bottles.some(b => b.id === state.referenceId)) throw new TypeError('Invalid saved reference');
  return state;
}
export function serialize(state) {
  validate(state);
  return JSON.stringify(state);
}
export function restore(serialized) {
  if (typeof serialized !== 'string') throw new TypeError('Saved state must be JSON text');
  return freeze(validate(JSON.parse(serialized)));
}
