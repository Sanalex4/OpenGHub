import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, encodeTextMacro, encodeSteps, readProfiles, readSector, validSector, writeSector, writeTextMacro, writeMacro } from './onboard.js';

function sealed(bytes) {
  const crc = crc16(bytes.subarray(0, -2));
  bytes[bytes.length - 2] = crc >> 8;
  bytes[bytes.length - 1] = crc & 255;
  return bytes;
}

test('CRC matches a real device directory', () => {
  const sector = new Uint8Array(255).fill(255);
  sector.set([0,1,1,0, 0,2,0,0, 0,3,0,0, 0,4,0,0, 0,5,0,0, 255,255,0,0]);
  sector[253] = 0x1b; sector[254] = 0x6f;
  assert.equal(validSector(sector), true);
  sector[2] ^= 1;
  assert.equal(validSector(sector), false);
});

test('text macros encode modifiers, delays and termination', () => {
  assert.deepEqual([...encodeTextMacro('Ab', 25)], [0x22, 2, 0x20, 4, 0x21, 4, 0x23, 2, 0x80, 0, 25, 0x20, 5, 0x21, 5, 0xff]);
  assert.throws(() => encodeTextMacro('я', 0), /не поддерживается/);
});

test('sequence macros encode shortcuts, clicks and pauses', () => {
  assert.deepEqual([...encodeSteps([{ type: 'key', usage: 6, modifiers: 1 }, { type: 'delay', ms: 300 }, { type: 'mouse', mask: 2 }])], [0x22, 1, 0x20, 6, 0x21, 6, 0x23, 1, 0x80, 1, 44, 0x40, 0, 2, 0x41, 0, 2, 0xff]);
  assert.throws(() => encodeSteps([]), /действие/);
  assert.throws(() => encodeSteps([{ type: 'mouse', mask: 256 }]), /Некорректное/);
});

test('read, backup, write and verify a profile without touching other bytes', async () => {
  const sectors = Array.from({ length: 16 }, () => new Uint8Array(255).fill(255));
  sectors[0].set([0, 1, 1, 0, 255, 255]); sealed(sectors[0]);
  sectors[1] = new Uint8Array(255);
  sectors[1].set([0x80, 1, 0, 1], 32);
  sectors[1].set([0x80, 1, 0, 2], 36);
  sealed(sectors[1]);
  let writeOffset = 0, target = 0, writing = null;
  const client = {
    device: { productId: 0xc092 },
    async feature(id) { return id === 0x8100 ? 7 : 0; },
    async call(_feature, fn, params = []) {
      if (fn === 0) return Uint8Array.from([1, 4, 1, 1, 1, 6, 16, 0, 255]);
      if (fn === 4) return Uint8Array.from([0, 1]);
      if (fn === 5) return sectors[(params[0] << 8) | params[1]].slice((params[2] << 8) | params[3], ((params[2] << 8) | params[3]) + 16);
      if (fn === 6) { target = (params[0] << 8) | params[1]; writing = new Uint8Array(255); writeOffset = 0; return new Uint8Array(16); }
      if (fn === 7) { const part = params.slice(0, Math.min(16, 255 - writeOffset)); writing.set(part, writeOffset); writeOffset += part.length; return new Uint8Array(16); }
      if (fn === 8) { sectors[target] = writing; return new Uint8Array(16); }
      throw new Error(`Unexpected function ${fn}`);
    },
  };
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const info = await readProfiles(client);
  assert.deepEqual(info.entries, [{ sector: 1, enabled: true }]);
  const original = await readSector(client, info, 1);
  const changed = original.slice(); changed[40] = 0x80;
  const written = await writeSector(client, info, 1, original, changed);
  assert.equal(written[40], 0x80);
  assert.equal(validSector(written), true);
  assert.equal(JSON.parse(storage.get(`openghub-backup-49298-1-${client.session}`)).bytes[40], 0);
  await assert.rejects(() => writeSector(client, info, 1, original, changed), /изменился/);
  const withMacro = await writeTextMacro(client, info, 1, written, 1, 'abc', 20);
  assert.deepEqual([...withMacro.slice(36, 40)], [0, 15, 0, 0]);
  assert.equal(sectors[15][0], 0x20);
  const sequence = encodeSteps([{ type: 'key', usage: 6, modifiers: 1 }, { type: 'delay', ms: 50 }, { type: 'mouse', mask: 2 }]);
  const withSequence = await writeMacro(client, info, 1, withMacro, 2, sequence);
  const offset = (withSequence[42] << 8) | withSequence[43];
  assert.deepEqual([...sectors[15].slice(offset, offset + sequence.length)], [...sequence]);
  assert.equal(sectors[15][0], 0x20);
  await assert.rejects(() => writeTextMacro(client, info, 1, withMacro, 0, 'x', 0), /левое нажатие/);
});
