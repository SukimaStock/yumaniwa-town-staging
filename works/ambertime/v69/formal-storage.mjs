// Each deployed work directory owns its database, including protected exports.
// Cache reads keep rendering synchronous. Writes publish that cache only after
// the IndexedDB transaction commits the main record and any backups together.
export function createFormalStorage({scope, main, previous, legacy, onChange}) {
  const name = 'sukimastock.ambertime:' + scope;
  const records = 'records', revisionKey = '@revision';
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null;
  let db, cache = null, revision = 0, pending = false;
  const conflict = () => Object.assign(new Error('別の画面で保存が変わりました。再読み込みしてください。'), {code:'conflict'});
  const requireReady = () => {
    if (!cache) throw new Error('保存領域を確認できません。');
  };
  channel?.addEventListener('message', event => {
    if (cache && Number.isSafeInteger(event.data) && event.data > revision) onChange();
  });
  function transaction(mode, perform) {
    return new Promise((resolve,reject) => {
      const tx = db.transaction(records, mode), store = tx.objectStore(records);
      let reason;
      const abort = error => { reason = error; try {tx.abort();} catch {/* Already aborting. */} };
      tx.onabort = () => reject(reason ?? tx.error ?? Error('保存を中断しました。'));
      tx.oncomplete = () => resolve();
      perform(store, abort);
    });
  }
  async function refresh() {
    if (!db) {
      db = await new Promise((resolve,reject) => {
        let blocked = false;
        const request = indexedDB.open(name, 1);
        request.onblocked = () => {blocked = true; reject(Error("他の画面の保存領域を閉じて再確認してください。"));};
        request.onupgradeneeded = () => request.result.createObjectStore(records);
        request.onsuccess = () => {if (blocked) request.result.close(); else resolve(request.result);};
        request.onerror = () => reject(request.error);
      });
      db.onversionchange = () => {db.close(); db = null; cache = null; onChange();};
    }
    // The only historical deployment that owns the pre-scope keys is Staging.
    // Copy once without touching the originals. Production never probes them.
    const migrate = scope === '/yumaniwa-town-staging/works/ambertime/';
    const next = new Map();
    await transaction('readwrite', (store, abort) => {
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        try {
          const row = cursor.result;
          if (row) {next.set(row.key,row.value); row.continue(); return;}
          if (!next.has(revisionKey)) {
            const add = (key,value) => {if (value != null) {store.add(value,key); next.set(key,value);}};
            if (migrate) {
              add(main,localStorage.getItem(main) ?? localStorage.getItem(previous));
              for (let i=0; i<localStorage.length; i++) {
                const key=localStorage.key(i);
                if (legacy.includes(key) || key?.startsWith(main+'.before-')) add(key,localStorage.getItem(key));
              }
            }
            add(revisionKey,0);
          }
        } catch (error) {abort(error);}
      };
    });
    revision = next.get(revisionKey);
    next.delete(revisionKey);
    cache = next;
  }
  async function commit(expected, write) {
    requireReady();
    if (pending || (cache.get(main) ?? null) !== expected) throw conflict();
    pending = true;
    try {
      const updates = new Map(), current = revision;
      const staging = {
        getItem: key => updates.has(key) ? updates.get(key) : cache.get(key) ?? null,
        setItem: (key,value) => updates.set(key,value)
      };
      write(staging);
      await transaction('readwrite', (store, abort) => {
        const check=store.get(revisionKey);
        check.onsuccess=() => {
          if (check.result !== current) {abort(conflict()); return;}
          try {
            for (const [key,value] of updates) {
              store.put(value,key);
              const readback=store.get(key);
              readback.onsuccess=() => {
                if (readback.result !== value) abort(Error('書き込んだ記録が一致しません。'));
              };
            }
            store.put(current+1,revisionKey);
          } catch (error) {abort(error);}
        };
      });
      for (const [key,value] of updates) cache.set(key,value);
      revision=current+1;
      try {channel?.postMessage(revision);} catch {/* Other writers still check the revision in IndexedDB. */}
    } finally {pending=false;}
  }
  return {refresh,commit,get pending(){return pending;},
    getItem(key){requireReady();return cache.get(key) ?? null;},
    get length(){requireReady();return cache.size;},
    key(i){requireReady();return [...cache.keys()][i] ?? null;}
  };
}
