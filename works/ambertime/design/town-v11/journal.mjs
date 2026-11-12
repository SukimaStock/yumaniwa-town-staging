// Independent Lab ONLY: fixed trusted town-model adapters, not arbitrary callbacks.
// Public input is detached on entry; no raw workspace or operation result escapes.
// New model-local objects may receive late primitive writes after push (r.eventId).
// These objects must not be retained/mutated by external callers after execute().
export function createOwnedTownJournal(input) {
  const raw = structuredClone(input), known = new WeakSet();
  let toProxy = new WeakMap(); const toRaw = new WeakMap();
  let tx = null, revision = 0;
  const object = v => v !== null && typeof v === 'object';
  function plain(v) {
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)
      throw Error('Lab supports plain JSON object/array graphs only');
    for (const key of Reflect.ownKeys(v)) {
      if (typeof key !== 'string') throw Error('Symbol property unsupported');
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (!('value' in d)) throw Error('Accessors unsupported');
    }
  }
  function remember(v) {
    if (!object(v) || known.has(v)) return;
    plain(v); known.add(v); for (const x of Object.values(v)) remember(x);
  }
  remember(raw);
  function requireTx() { if (!tx) throw Error('Private view cannot mutate outside execute'); }
  function adopt(v, seen = new WeakSet()) {
    if (!object(v)) return v;
    if (toRaw.has(v)) return toRaw.get(v);
    if (known.has(v) && !tx.newSet.has(v)) return v;
    if (seen.has(v)) return v;
    seen.add(v); plain(v);
    if (!known.has(v)) { known.add(v); tx.newSet.add(v); tx.newNodes.push(v); }
    for (const key of Object.keys(v)) {
      const next = adopt(v[key], seen);
      if (next !== v[key]) v[key] = next;
    }
    return v;
  }
  function log(target, key) {
    let keys = tx.seen.get(target);
    if (!keys) tx.seen.set(target, keys = new Set());
    if (keys.has(key)) return;
    keys.add(key); tx.undo.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  }
  const index = k => typeof k === 'string' && /^(0|[1-9]\d*)$/.test(k) && +k < 4294967295;
  function beforeArrayWrite(target, key, value) {
    if (!Array.isArray(target)) return;
    if (index(key) && +key >= target.length) log(target, 'length');
    if (key === 'length' && Number.isInteger(value) && value >= 0 && value < target.length) {
      log(target, 'length');
      for (let i = value; i < target.length; i++) if (Object.hasOwn(target, i)) log(target, String(i));
    }
  }
  function wrap(value) {
    if (!object(value)) return value;
    value = toRaw.get(value) ?? value;
    if (toProxy.has(value)) return toProxy.get(value);
    const proxy = new Proxy(value, {
      get(target, key) { return wrap(Reflect.get(target, key, target)); },
      set(target, key, value) {
        requireTx(); if (typeof key !== 'string') throw Error('Symbol write unsupported');
        value = adopt(value);
        if (Object.hasOwn(target, key) && Object.is(target[key], value)) { tx.noopWrites++; return true; }
        beforeArrayWrite(target, key, value); log(target, key); tx.writes++;
        const ok=Reflect.set(target, key, value, target); tx.hooks.afterWrite?.({key,writes:tx.writes});return ok;
      },
      deleteProperty(target, key) {
        requireTx(); if (!Object.hasOwn(target, key)) return true;
        // External-town model replaces queues but never deletes object keys.
        // Reject rather than reorder canonical object keys during descriptor undo.
        if (!Array.isArray(target)) throw Error('Object-key deletion unsupported in bounded town Lab');
        if (!Object.getOwnPropertyDescriptor(target, key).configurable) throw Error('Nonconfigurable delete');
        log(target, key); tx.writes++; const ok=Reflect.deleteProperty(target, key);tx.hooks.afterWrite?.({key,writes:tx.writes});return ok;
      },
      defineProperty(target, key, descriptor) {
        requireTx();
        if (typeof key !== 'string' || !('value' in descriptor) || descriptor.configurable === false || descriptor.writable === false ||
            (!Object.hasOwn(target, key) && (descriptor.configurable !== true || descriptor.writable !== true)))
          throw Error('Descriptor narrowing/accessors unsupported in Lab');
        const d = {...descriptor, value: adopt(descriptor.value)};
        beforeArrayWrite(target, key, d.value); log(target, key); tx.writes++;
        const ok=Reflect.defineProperty(target, key, d);tx.hooks.afterWrite?.({key,writes:tx.writes});return ok;
      },
      getOwnPropertyDescriptor(target, key) {
        const d = Reflect.getOwnPropertyDescriptor(target, key);
        return d && 'value' in d && d.configurable ? {...d, value: wrap(d.value)} : d;
      },
      setPrototypeOf() { throw Error('Prototype mutation unsupported'); },
      preventExtensions() { throw Error('Extensibility mutation unsupported'); }
    });
    toProxy.set(value, proxy); toRaw.set(proxy, value); return proxy;
  }
  const view = wrap(raw);
  function rollback() {
    for (let i = tx.undo.length - 1; i >= 0; i--) {
      const [target, key, d] = tx.undo[i];
      if (d) Object.defineProperty(target, key, d); else Reflect.deleteProperty(target, key);
    }
  }
  return Object.freeze({
    execute(run, hooks = {}) {
      if (tx) throw Error('Nested execute unsupported');
      const beforeRevision = revision;
      tx = {undo: [], seen: new WeakMap(), newNodes: [], newSet: new WeakSet(), writes: 0, noopWrites: 0, hooks};
      try {
        run(view); // Deliberately discard any raw model-local return value.
        // Late r.eventId writes and new-object proxy children are normalized here.
        for (let i = 0; i < tx.newNodes.length; i++) adopt(tx.newNodes[i]);
        hooks.beforeCommit?.();
        revision++;
        hooks.afterCommit?.(); // Tentative PRIVATE commit, undo retained until publication.
        const result = {revision, writes: tx.writes, noopWrites: tx.noopWrites, journalEntries: tx.undo.length, adoptedNodes: tx.newNodes.length};
        tx = null; return result;
      } catch (error) {
        rollback(); revision = beforeRevision; tx = null;
        // Invalidate private replay prefix certificates attached to old array proxies.
        // Undo may restore an unquantized input; retry must recertify from zero.
        toProxy = new WeakMap(); throw error;
      }
    },
    snapshot() {
      if (tx) throw Error('No workspace publication during transaction');
      return structuredClone(raw);
    },
    get revision() { return revision; }
  });
}
