/* Small stored-entry ZIP reader/writer. Images are compressed already, so no codec is needed. */
(() => {
  'use strict';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let n = i;
    for (let j = 0; j < 8; j++) n = (n & 1) ? (n >>> 1) ^ 0xedb88320 : n >>> 1;
    table[i] = n >>> 0;
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }
  function safeName(name) {
    return typeof name === 'string' && name.length > 0 && !name.startsWith('/') &&
      !name.includes('\\') && !name.split('/').some((part) => part === '' || part === '.' || part === '..');
  }
  function header(size) { return new DataView(new ArrayBuffer(size)); }
  function bytes(view) { return new Uint8Array(view.buffer); }

  async function create(entries, progress) {
    if (entries.length > 10002) throw new Error('ZIPのファイル数が多すぎます。');
    const parts = [];
    const central = [];
    const names = new Set();
    let offset = 0;
    for (let i = 0; i < entries.length; i++) {
      const { name, blob } = entries[i];
      if (!safeName(name) || names.has(name) || !(blob instanceof Blob)) throw new Error('ZIPのファイル名が不正です。');
      names.add(name);
      const nameBytes = encoder.encode(name);
      if (nameBytes.length > 65535 || blob.size > 0xffffffff) throw new Error('ZIPのファイルサイズが上限を超えています。');
      const data = new Uint8Array(await blob.arrayBuffer());
      const checksum = crc32(data);
      const local = header(30);
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // UTF-8
      local.setUint32(14, checksum, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      parts.push(bytes(local), nameBytes, blob);

      const directory = header(46);
      directory.setUint32(0, 0x02014b50, true);
      directory.setUint16(4, 20, true);
      directory.setUint16(6, 20, true);
      directory.setUint16(8, 0x0800, true);
      directory.setUint32(16, checksum, true);
      directory.setUint32(20, data.length, true);
      directory.setUint32(24, data.length, true);
      directory.setUint16(28, nameBytes.length, true);
      directory.setUint32(42, offset, true);
      central.push(bytes(directory), nameBytes);
      offset += 30 + nameBytes.length + data.length;
      if (offset > 0xffffffff) throw new Error('ZIPが4 GBを超えています。');
      if (progress) await progress(i + 1);
    }
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    if (offset + centralSize > 0xffffffff) throw new Error('ZIPが4 GBを超えています。');
    const end = header(22);
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, bytes(end)], { type: 'application/zip' });
  }

  async function read(file) {
    if (file.size > 1024 * 1024 * 1024) throw new Error('ZIPが大きすぎます。');
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const u16 = (at) => view.getUint16(at, true);
    const u32 = (at) => view.getUint32(at, true);
    const check = (at, length) => {
      if (!Number.isSafeInteger(at) || at < 0 || at + length > data.length) throw new Error('ZIPの内容が途中で切れています。');
    };
    let end = -1;
    for (let pos = data.length - 22; pos >= Math.max(0, data.length - 65557); pos--) {
      if (u32(pos) === 0x06054b50 && pos + 22 + u16(pos + 20) === data.length) { end = pos; break; }
    }
    if (end < 0 || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10) || u16(end + 10) > 10002) throw new Error('対応していないZIP形式です。');
    const length = u32(end + 12);
    let pos = u32(end + 16);
    if (pos + length !== end) throw new Error('ZIPの目次が不正です。');
    const entries = new Map();
    for (let i = 0; i < u16(end + 10); i++) {
      check(pos, 46);
      if (u32(pos) !== 0x02014b50 || u16(pos + 10) !== 0 || (u16(pos + 8) & ~0x0800)) throw new Error('対応していないZIP形式です。');
      const size = u32(pos + 24);
      const packed = u32(pos + 20);
      const nameLength = u16(pos + 28);
      const extra = u16(pos + 30);
      const comment = u16(pos + 32);
      check(pos, 46 + nameLength + extra + comment);
      const name = decoder.decode(data.subarray(pos + 46, pos + 46 + nameLength));
      if (!safeName(name) || entries.has(name) || size !== packed || size > 256 * 1024 * 1024) throw new Error('ZIPのファイルが不正です。');
      const localPos = u32(pos + 42);
      check(localPos, 30);
      if (u32(localPos) !== 0x04034b50 || u16(localPos + 8) !== 0 || u16(localPos + 6) !== u16(pos + 8) ||
          u32(localPos + 14) !== u32(pos + 16) || u32(localPos + 18) !== packed || u32(localPos + 22) !== size) throw new Error('ZIPの画像データが不正です。');
      const localNameLength = u16(localPos + 26);
      const start = localPos + 30 + localNameLength + u16(localPos + 28);
      check(start, size);
      if (decoder.decode(data.subarray(localPos + 30, localPos + 30 + localNameLength)) !== name || start + size > u32(end + 16)) throw new Error('ZIPのファイル名が一致しません。');
      const content = data.subarray(start, start + size);
      if (crc32(content) !== u32(pos + 16)) throw new Error('ZIPのチェックサムが一致しません。');
      entries.set(name, new Blob([content]));
      pos += 46 + nameLength + extra + comment;
    }
    if (pos !== end) throw new Error('ZIPの目次が不正です。');
    return entries;
  }
  window.MapFactoryZip = { create, read };
})();
