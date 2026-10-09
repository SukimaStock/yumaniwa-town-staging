(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./catalog.js') : root.MotionCatalog;
  const SCHEMA = 'sukimastock-motion-specimens/1', KEY = 'sukimastock.motion-lab.specimens.v1', LIMIT = 200;
  function validateRecord(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('標本の形式が違います。');
    const entry = C.catalog.find(e => e.id === raw.experiment);
    if (!entry || raw.programVersion !== entry.version) throw new Error('この標本の実験・バージョンには対応していません。');
    if (typeof raw.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)) throw new Error('標本IDが不正です。');
    if (raw.source !== entry.source) throw new Error('原作の参照が一致しません。');
    if (raw.interactionMode !== undefined && !['sweet', 'bitter'].includes(raw.interactionMode)) throw new Error('操作モードが不正です。');
    if (!Number.isInteger(raw.seed) || raw.seed < 0 || raw.seed > 4294967295) throw new Error('乱数シードが不正です。');
    if (typeof raw.savedAt !== 'string' || !Number.isFinite(Date.parse(raw.savedAt))) throw new Error('保存日時が不正です。');
    if (typeof raw.title !== 'string' || raw.title.length > 80 || typeof raw.memo !== 'string' || raw.memo.length > 300) throw new Error('タイトル・メモが長すぎるか、形式が違います。');
    if (!raw.parameters || entry.parameters.some(p => typeof raw.parameters[p.key] !== 'number' || !Number.isFinite(raw.parameters[p.key]) || raw.parameters[p.key] < p.min || raw.parameters[p.key] > p.max)) throw new Error('調整値が範囲外です。');
    return { id: raw.id, experiment: entry.id, experimentName: entry.title, source: entry.source, parameters: C.normalize(entry.id, raw.parameters), programVersion: entry.version, seed: raw.seed, interactionMode: entry.id === 'firefly' ? raw.interactionMode || 'sweet' : 'sweet', savedAt: new Date(raw.savedAt).toISOString(), title: raw.title, memo: raw.memo };
  }
  function parse(text) {
    if (typeof text !== 'string' || text.length > 1000000) throw new Error('ファイルが大きすぎます。');
    let data; try { data = JSON.parse(text); } catch (_) { throw new Error('JSONを読み取れませんでした。'); }
    if (data?.schema !== SCHEMA || !Array.isArray(data.specimens) || data.specimens.length > LIMIT) throw new Error('対応していない形式、または標本数が上限を超えています。');
    const specimens = data.specimens.map(validateRecord), ids = new Set();
    for (const s of specimens) { if (ids.has(s.id)) throw new Error('ファイル内の標本IDが重複しています。'); ids.add(s.id); }
    return specimens;
  }
  class Shelf {
    constructor(backend) {
      this.backend = backend; this.specimens = []; this.error = ''; this.persistent = true;
      try { const text = backend?.getItem(KEY); if (text) this.specimens = parse(text); if (!backend) throw new Error(); }
      catch (_) { this.error = '保存データを読み取れませんでした。既存データは変更していません。JSONから復元できます。'; this.persistent = false; }
    }
    write(next) {
      this.specimens = next; this.error = '';
      try { if (!this.backend) throw new Error(); this.backend.setItem(KEY, this.export()); this.persistent = true; }
      catch (_) { this.persistent = false; this.error = '端末への保存ができません。この画面を閉じる前にJSONを書き出してください。'; }
      return this.persistent;
    }
    add(record) {
      const validated = validateRecord(record);
      if (this.specimens.length >= LIMIT) throw new Error('標本棚がいっぱいです。JSONに残して、不要な標本を削除してください。');
      if (this.specimens.some(s => s.id === validated.id)) throw new Error('標本IDが重複しています。');
      return this.write([...this.specimens, validated]);
    }
    remove(id) { return this.write(this.specimens.filter(s => s.id !== id)); }
    import(text) {
      const incoming = parse(text), ids = new Set(this.specimens.map(s => s.id)), fresh = incoming.filter(s => !ids.has(s.id));
      if (this.specimens.length + fresh.length > LIMIT) throw new Error('取り込むと標本数の上限を超えます。');
      if (fresh.length) this.write([...this.specimens, ...fresh]);
      return { added: fresh.length, skipped: incoming.length - fresh.length, persistent: this.persistent };
    }
    export() { return JSON.stringify({ schema: SCHEMA, specimens: this.specimens }, null, 2); }
  }
  const api = { SCHEMA, KEY, LIMIT, validateRecord, parse, Shelf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotionStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
