(function (root) {
  'use strict';
  const Registry = typeof module !== 'undefined' && module.exports ? require('./registry.js') : root.FeelRegistry;
  const SCHEMA = 'sukimastock-feel-studio/1', VERSION = '0.1.0';
  const KEY = 'sukimastock.feel-studio.workspace.v1', STEP = 1 / 120, MAX_SAVED = 200, MAX_FRAMES = 720;
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
  function text(value, max) {
    if (typeof value !== 'string' || value.length > max) throw new Error('名前・メモの形式が違うか、長すぎます。');
    return value;
  }
  function sourcesFor(entry, id, spec) {
    return Object.fromEntries(Object.keys(entry.choices).map(key => [key, {
      variantId: id, component: spec.components[key], prototypeVersion: entry.version, sourceSpec: clone(spec)
    }]));
  }
  function validateSources(raw, entry, spec) {
    if (!raw || typeof raw !== 'object') throw new Error('部分採用の記録がありません。');
    return Object.fromEntries(Object.keys(entry.choices).map(key => {
      const part = raw[key];
      if (!part || !validId(part.variantId) || part.prototypeVersion !== entry.version ||
          part.component !== spec.components[key]) throw new Error('部分採用の出典が一致しません。');
      const sourceSpec = entry.validate(part.sourceSpec);
      if (sourceSpec.components[key] !== part.component) throw new Error('部分採用元の設定が一致しません。');
      return [key, { variantId: part.variantId, component: part.component, prototypeVersion: entry.version, sourceSpec }];
    }));
  }
  function validateSnapshot(raw, entry) {
    if (!raw || !validId(raw.id) || ['A', 'B', 'C'].includes(raw.id) || !['A', 'B', 'C', 'M'].includes(raw.family) ||
        !validId(raw.parentId) || !Number.isInteger(raw.sequence) || raw.sequence < 1 ||
        typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))) throw new Error('保存した案の形式が違います。');
    const spec = entry.validate(raw.spec);
    return { id: raw.id, family: raw.family, sequence: raw.sequence, title: text(raw.title, 80),
      parentId: raw.parentId, createdAt: new Date(raw.createdAt).toISOString(),
      spec, sources: validateSources(raw.sources, entry, spec) };
  }
  function validateTape(raw, entry) {
    if (raw === null || raw === undefined) return null;
    if (!raw || raw.prototypeId !== entry.id || raw.prototypeVersion !== entry.version ||
        raw.step !== STEP || !validId(raw.sourceId) || !Array.isArray(raw.frames) ||
        !raw.frames.length || raw.frames.length > MAX_FRAMES) throw new Error('指の記録の形式が違います。');
    const sourceSpec = entry.validate(raw.sourceSpec);
    const frames = raw.frames.map(frame => {
      if (!frame || typeof frame.active !== 'boolean' || !Number.isFinite(frame.x) || !Number.isFinite(frame.y) ||
          frame.x < 0 || frame.x > entry.width || frame.y < 0 || frame.y > entry.height) throw new Error('指の記録が範囲外です。');
      return { active: frame.active, x: frame.x, y: frame.y };
    });
    return { prototypeId: entry.id, prototypeVersion: entry.version, step: STEP, sourceId: raw.sourceId, sourceSpec, frames };
  }
  function validateDocument(raw, entry) {
    if (!raw || raw.schema !== SCHEMA || raw.studioVersion !== VERSION ||
        raw.prototype?.id !== entry.id || raw.prototype?.version !== entry.version ||
        !Array.isArray(raw.snapshots) || raw.snapshots.length > MAX_SAVED || !raw.workspace || !raw.decisions) {
      throw new Error('Feel Studioの対応するJSONではありません。');
    }
    const snapshots = raw.snapshots.map(s => validateSnapshot(s, entry));
    const known = new Set(['A', 'B', 'C']);
    for (const s of snapshots) { if (known.has(s.id)) throw new Error('案のIDが重複しています。'); known.add(s.id); }
    for (const s of snapshots) if (!known.has(s.parentId)) throw new Error('元になった案がありません。');
    const parents = new Map(snapshots.map(s => [s.id, s.parentId]));
    for (const s of snapshots) {
      const path = new Set(); let id = s.id;
      while (parents.has(id)) {
        if (path.has(id)) throw new Error('保存案の履歴が循環しています。');
        path.add(id); id = parents.get(id);
      }
    }
    const drafts = {};
    if (!raw.workspace.drafts || typeof raw.workspace.drafts !== 'object' || Array.isArray(raw.workspace.drafts)) throw new Error('作業中の案がありません。');
    for (const [id, draft] of Object.entries(raw.workspace.drafts)) {
      if (!known.has(id) || !draft) throw new Error('作業中の案のIDが違います。');
      const spec = entry.validate(draft.spec);
      drafts[id] = { spec, sources: validateSources(draft.sources, entry, spec) };
    }
    for (const id of ['A', 'B', 'C']) if (!drafts[id]) throw new Error('A/B/Cの作業案がありません。');
    for (const item of [...snapshots, ...Object.values(drafts)]) {
      for (const part of Object.values(item.sources)) if (!known.has(part.variantId)) throw new Error('部分採用元の案がありません。');
    }
    const selectedId = raw.workspace.selectedId;
    if (!known.has(selectedId)) throw new Error('選択中の案がありません。');
    const scene = entry.validate({ ...entry.presets[0].spec, world: raw.workspace.world }).world;
    const d = raw.decisions;
    if (d.adoptedId !== null && (!known.has(d.adoptedId) || ['A', 'B', 'C'].includes(d.adoptedId))) throw new Error('採用した保存案がありません。');
    if (!Array.isArray(d.keepIds) || !Array.isArray(raw.workspace.comparedIds) ||
        d.keepIds.some(id => !known.has(id)) || raw.workspace.comparedIds.some(id => !known.has(id)) ||
        new Set(d.keepIds).size !== d.keepIds.length || new Set(raw.workspace.comparedIds).size !== raw.workspace.comparedIds.length) throw new Error('比較・保護対象のIDが違います。');
    return { snapshots, workspace: { selectedId, world: scene, drafts, comparedIds: [...raw.workspace.comparedIds],
      tape: validateTape(raw.workspace.tape, entry) },
      decisions: { adoptedId: d.adoptedId, keepIds: [...d.keepIds], comment: text(d.comment, 500),
        locks: text(d.locks, 500), request: text(d.request, 1000) } };
  }
  function parse(source, entry) {
    if (typeof source !== 'string' || source.length > 4000000) throw new Error('JSONが大きすぎます。');
    let raw; try { raw = JSON.parse(source); } catch (_) { throw new Error('JSONを読み取れません。'); }
    return validateDocument(raw, entry);
  }
  class Session {
    constructor(prototypeId, backend, options = {}) {
      this.entry = Registry.get(prototypeId); this.storageKey = KEY + '.' + this.entry.id;
      this.backend = backend; this.idFactory = options.idFactory || (() => 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9));
      this.snapshots = []; this.drafts = {};
      this.selectedId = 'A'; this.world = clone(this.entry.presets[0].spec.world);
      this.comparedIds = ['A']; this.tape = null; this.history = [];
      this.decisions = { adoptedId: null, keepIds: [], comment: '', locks: '', request: '' };
      this.error = ''; this.persistent = !!backend; this.blocked = false;
      for (const p of this.entry.presets) this.drafts[p.id] = { spec: clone(p.spec), sources: sourcesFor(this.entry, p.id, p.spec) };
      try {
        if (!backend) throw new Error('storage');
        const saved = backend.getItem(this.storageKey);
        if (saved) this.restore(parse(saved, this.entry));
      } catch (_) {
        this.persistent = false; this.blocked = !!backend;
        this.error = backend ? '保存データを読み取れませんでした。元のデータは上書きせず、この画面だけで作業します。JSONに残してください。' :
          'この画面では端末に保存できません。閉じる前にJSONに残してください。';
      }
    }
    restore(data) {
      this.snapshots = clone(data.snapshots);
      Object.assign(this, clone(data.workspace));
      this.decisions = clone(data.decisions); this.history = [];
    }
    records() {
      return [...this.entry.presets.map(p => ({ id: p.id, family: p.id, title: p.id + ' · ' + p.title, spec: clone(p.spec), sequence: 1 })),
        ...clone(this.snapshots)];
    }
    record(id) {
      const item = this.records().find(r => r.id === id);
      if (!item) throw new Error('その案が見つかりません。');
      return item;
    }
    draft(id = this.selectedId) {
      const record = this.record(id);
      return clone(this.drafts[id] || { spec: record.spec, sources: record.sources });
    }
    spec() { return this.entry.validate({ ...this.draft().spec, world: clone(this.world) }); }
    dirty() { return !equal(this.spec(), this.record(this.selectedId).spec); }
    select(id) {
      const record = this.record(id);
      if (!['A', 'B', 'C'].includes(id)) this.world = clone(this.draft(id).spec.world);
      this.selectedId = id;
      if (!this.comparedIds.includes(id)) this.comparedIds.push(id);
      this.history = []; this.persist(); return this.spec();
    }
    checkpoint() { this.history.push(this.spec()); if (this.history.length > 40) this.history.shift(); }
    setSpec(spec, remember = false) {
      if (remember) this.checkpoint();
      const next = this.entry.validate(spec), draft = this.draft();
      this.world = clone(next.world);
      if (next.strength !== draft.spec.strength && draft.sources.drive) {
        draft.sources.drive = { variantId: this.selectedId, component: next.components.drive,
          prototypeVersion: this.entry.version, sourceSpec: clone(next) };
      }
      this.drafts[this.selectedId] = { spec: next, sources: draft.sources };
    }
    undo() {
      if (!this.history.length) return false;
      this.setSpec(this.history.pop()); this.persist(); return true;
    }
    restoreSelected() {
      const record = this.record(this.selectedId);
      this.checkpoint(); this.world = clone(record.spec.world);
      this.drafts[this.selectedId] = { spec: clone(record.spec), sources: record.sources || sourcesFor(this.entry, record.id, record.spec) };
      this.persist();
    }
    newSnapshot(spec, sources, family, title) {
      if (this.snapshots.length >= MAX_SAVED) throw new Error('保存案が200件あります。JSONを書き出して残してください。');
      const id = this.idFactory();
      if (!validId(id) || this.records().some(r => r.id === id)) throw new Error('新しい案のIDが重複しました。もう一度保存してください。');
      const sequence = family === 'M' ? this.snapshots.filter(s => s.family === family).length + 1 : this.snapshots.filter(s => s.family === family).length + 2;
      const snapshot = validateSnapshot({ id, family, sequence, title: title || family + sequence,
        parentId: this.selectedId, createdAt: new Date().toISOString(), spec, sources }, this.entry);
      // The child keeps the edited state; the parent returns to its immutable baseline.
      const parent = this.record(this.selectedId);
      this.drafts[parent.id] = { spec: clone(parent.spec),
        sources: parent.sources || sourcesFor(this.entry, parent.id, parent.spec) };
      this.snapshots.push(snapshot); this.selectedId = id;
      this.drafts[id] = { spec: clone(snapshot.spec), sources: clone(snapshot.sources) };
      this.world = clone(spec.world); this.history = [];
      if (!this.comparedIds.includes(id)) this.comparedIds.push(id);
      return clone(snapshot);
    }
    save(title = '') {
      const record = this.record(this.selectedId), spec = this.spec(), sources = this.draft().sources;
      const snapshot = this.newSnapshot(spec, sources, record.family, title);
      this.persist(); return snapshot;
    }
    compose(donors, title = '') {
      // Only registered separable components are synthesized. A driver is kept whole.
      const spec = this.spec(), sources = {};
      for (const key of Object.keys(this.entry.choices)) {
        if (!donors[key]) throw new Error('取り入れる部分を選んでください。');
        const donor = this.draft(donors[key]), sourceSpec = this.entry.validate(donor.spec);
        spec.components[key] = sourceSpec.components[key];
        if (key === 'drive') spec.strength = sourceSpec.strength;
        sources[key] = { variantId: donors[key], component: spec.components[key], prototypeVersion: this.entry.version, sourceSpec };
        if (!this.comparedIds.includes(donors[key])) this.comparedIds.push(donors[key]);
      }
      const snapshot = this.newSnapshot(this.entry.validate(spec), sources, 'M', title);
      this.persist(); return snapshot;
    }
    adopt() { const s = this.save(); this.decisions.adoptedId = s.id; this.persist(); return s; }
    keep() {
      // Freeze an edited state before promising to keep it.
      const id = this.dirty() ? this.save().id : this.selectedId;
      const set = new Set(this.decisions.keepIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      this.decisions.keepIds = [...set]; this.persist(); return id;
    }
    setNotes(notes) {
      for (const [key, limit] of [['comment', 500], ['locks', 500], ['request', 1000]]) {
        if (key in notes) this.decisions[key] = text(notes[key], limit);
      }
      this.persist();
    }
    setTape(tape) { this.tape = validateTape(tape, this.entry); this.persist(); }
    data() {
      return { schema: SCHEMA, studioVersion: VERSION, prototype: { id: this.entry.id, version: this.entry.version },
        snapshots: clone(this.snapshots), workspace: { selectedId: this.selectedId, world: clone(this.world),
          drafts: clone(this.drafts), comparedIds: [...this.comparedIds], tape: clone(this.tape) },
        decisions: clone(this.decisions) };
    }
    persist() {
      if (this.blocked) return false;
      try {
        if (!this.backend) throw new Error('storage');
        this.backend.setItem(this.storageKey, JSON.stringify(this.data()));
        this.persistent = true; this.error = ''; return true;
      } catch (_) {
        this.persistent = false;
        this.error = '端末への保存ができません。この画面を閉じる前にJSONに残してください。';
        return false;
      }
    }
    summary() {
      const selected = this.record(this.selectedId);
      const adopted = this.decisions.adoptedId ? this.record(this.decisions.adoptedId).title : '未決定';
      const kept = this.decisions.keepIds.map(id => this.record(id).title).join('、') || '指定なし';
      const source = this.draft().sources;
      return [
        'Feel Studio ' + VERSION + ' / ' + this.entry.title + ' ' + this.entry.version,
        '今の案: ' + selected.title + (this.dirty() ? '（調整中）' : ''),
        '動き: ' + this.entry.describe(this.spec()),
        '部分採用: ' + Object.keys(this.entry.choices).map(k => k + '=' + this.record(source[k].variantId).title).join('、'),
        '採用: ' + adopted, '残す案: ' + kept,
        '変えない部分: ' + (this.decisions.locks || '指定なし'),
        '追加実装: ' + (this.decisions.request || '指定なし'),
        '作者のコメント: ' + (this.decisions.comment || 'なし'),
        '再生: ' + (this.tape ? (this.tape.frames.length * STEP).toFixed(2) + '秒の指の位置を保持' : '記録なし'),
        this.entry.inputMeaning,
        '対象はStagingの独立した試作。既存作品・Engine・Productionは変更しない。'
      ].join('\n');
    }
    export() {
      return JSON.stringify({ ...this.data(), handoff: {
        compared: this.comparedIds.map(id => ({ id, title: this.record(id).title, ...this.draft(id) })),
        current: { id: this.selectedId, spec: this.spec(), sources: this.draft().sources },
        summary: this.summary(), inputComparisonLimit: this.entry.inputMeaning,
        implementation: { registry: 'works/feel-studio/registry.js', prototype: this.entry.id,
          scope: 'staging-only', unsupportedChanges: this.decisions.request }
      } }, null, 2);
    }
    import(source) {
      const incoming = parse(source, this.entry);
      const current = new Map(this.snapshots.map(s => [s.id, s]));
      for (const s of incoming.snapshots) if (current.has(s.id) && !equal(current.get(s.id), s)) throw new Error('同じIDで設定が異なる案があります。既存の案は変更していません。');
      const merged = [...this.snapshots, ...incoming.snapshots.filter(s => !current.has(s.id))];
      if (merged.length > MAX_SAVED) throw new Error('取り込むと保存案が200件を超えます。');
      const added = merged.length - this.snapshots.length;
      // Retain local immutable snapshots; restore the imported working desk.
      this.restore({ ...incoming, snapshots: merged });
      this.persist(); return added;
    }
  }
  const api = { Session, SCHEMA, VERSION, KEY, STEP, MAX_FRAMES, parse, validateDocument, validateTape };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeelSession = api;
})(typeof window !== 'undefined' ? window : globalThis);
