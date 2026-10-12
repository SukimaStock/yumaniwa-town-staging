(function (root) {
  'use strict';
  const entries = new Map();
  function register(entry) {
    if (!entry || !/^[a-z][a-z0-9-]{2,48}$/.test(entry.id) ||
        !/^\d+\.\d+\.\d+$/.test(entry.version) || entries.has(entry.id) ||
        typeof entry.create !== 'function' || typeof entry.validate !== 'function' ||
        typeof entry.draw !== 'function' || typeof entry.edit !== 'function' ||
        typeof entry.handles !== 'function' || typeof entry.describe !== 'function' ||
        typeof entry.inputMeaning !== 'string' || !entry.choices || !Object.keys(entry.choices).length ||
        !Number.isFinite(entry.width) || entry.width <= 0 || !Number.isFinite(entry.height) || entry.height <= 0 ||
        !Array.isArray(entry.presets) ||
        entry.presets.map(p => p.id).join(',') !== 'A,B,C') {
      throw new Error('試作の登録方法が違います。');
    }
    entries.set(entry.id, Object.freeze(entry));
    return entry;
  }
  function get(id, version) {
    const entry = entries.get(id);
    if (!entry || (version && entry.version !== version)) throw new Error('試作のバージョンが一致しません。');
    return entry;
  }
  const api = { register, get, all: () => [...entries.values()] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeelRegistry = api;
})(typeof window !== 'undefined' ? window : globalThis);
