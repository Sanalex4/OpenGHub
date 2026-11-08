import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hidpp, dpiValues } from './hidpp.js';

test('DPI ranges contain all valid steps across segment boundaries', () => {
  assert.deepEqual(dpiValues([0, 100, 0xe0, 50, 1, 44, 0xe0, 100, 2, 88, 0, 0]), [100, 150, 200, 250, 300, 400, 500, 600]);
});

test('onboard mode is enabled and verified before use', async () => {
  const client = Object.create(Hidpp.prototype);
  let value = 2, writes = 0;
  client.readMode = async () => ({ feature: 7, value });
  client.setMode = async (_mode, next) => { writes++; value = next; return client.readMode(); };
  assert.equal((await client.enableOnboard()).value, 1);
  await client.enableOnboard();
  assert.equal(writes, 1);
  value = 2; client.setMode = async () => ({ feature: 7, value: 2 });
  await assert.rejects(() => client.enableOnboard(), /не подтвердила/);
});

test('lighting uses the zone-local effect index and the requested persistence', async () => {
  const calls = [];
  const client = Object.create(Hidpp.prototype);
  client.feature = async id => id === 0x8071 ? 7 : 0;
  client.call = async (feature, fn, params) => {
    calls.push({ feature, fn, params });
    if (fn === 0 && params[0] === 255) return Uint8Array.from([0, 0, 1]);
    if (fn === 0 && params[1] === 255) return Uint8Array.from([0, 0, 0, 1, 2]);
    if (fn === 0) return Uint8Array.from([0, 0, 0, params[1] ? 10 : 1]);
    return new Uint8Array(16);
  };
  const lighting = await client.readLighting();
  assert.deepEqual(lighting.zones[0].effects, [1, 10]);
  await client.setLighting(lighting, 0, 10, '#112233', 3000, 80, false);
  assert.deepEqual(calls.at(-2), { feature: 7, fn: 5, params: [1, 3, 5] });
  assert.deepEqual(calls.at(-1), { feature: 7, fn: 1, params: [0, 1, 0x11, 0x22, 0x33, 0x0b, 0xb8, 0, 80, 0, 0, 0, 0] });
  await client.setLighting(lighting, 0, 10, '#112233', 3000, 80, true);
  assert.equal(calls.at(-1).params[12], 1);
});

test('extended DPI pages are joined before decoding and rate uses wireless slot', async () => {
  const calls = [];
  const client = Object.create(Hidpp.prototype);
  client.index = 1;
  client.feature = async id => ({ 0x2202: 9, 0x8061: 12 })[id] || 0;
  client.call = async (feature, fn, params) => {
    calls.push({ feature, fn, params });
    if (feature === 9 && fn === 1) return Uint8Array.from([0, 0, 2]);
    if (feature === 9 && fn === 5) return Uint8Array.from([0, 0x03, 0x20, 0x03, 0x20, 0x03, 0x20, 0x03, 0x20, 1]);
    if (feature === 9 && fn === 2 && params[2] === 0) return Uint8Array.from([0, 0, 0, 0, 100, 0xe0, 50, 1, 44, 0xe0, 100, 2, 88, 0xe0, 100, 3]);
    if (feature === 9 && fn === 2 && params[2] === 1) return Uint8Array.from([0, 0, 1, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    if (feature === 9 && fn === 2) return new Uint8Array(16);
    if (feature === 12 && fn === 1) return Uint8Array.from([0, 0x78]);
    if (feature === 12 && fn === 2) return Uint8Array.from([4]);
    if (feature === 12 && fn === 3) return new Uint8Array(16);
    if (feature === 9 && fn === 6) return new Uint8Array(16);
    throw new Error(`Unexpected call ${feature}:${fn}`);
  };
  const dpi = await client.readDpi();
  assert.deepEqual(dpi.values, [100, 150, 200, 250, 300, 400, 500, 600, 700, 800]);
  assert.equal(dpi.lodSupported, true);
  await client.setLod(dpi, 2);
  assert.ok(calls.some(c => c.feature === 9 && c.fn === 6 && c.params.join(',') === '0,3,32,3,32,2'));
  const rate = await client.readRate();
  assert.equal(rate.current, 2000);
  assert.deepEqual(rate.rates, [1000, 2000, 4000, 8000]);
  await client.setRate(rate, 4000);
  assert.ok(calls.some(c => c.feature === 12 && c.fn === 3 && c.params[0] === 1 && c.params[1] === 5));
});

test('HID++ requests use long reports, read settings and verify writes', async () => {
  class Mouse extends EventTarget {
    opened = false;
    dpi = 800;
    period = 1;
    async open() { this.opened = true; }
    async close() { this.opened = false; }
    async sendReport(id, data) {
      assert.equal(id, 0x11);
      assert.equal(data.length, 19);
      const [device, feature, command, ...params] = data;
      const fn = command >> 4;
      let result;
      if (feature === 0 && fn === 1) result = [4, 2, 0x5a];
      else if (feature === 0 && fn === 0) result = [({ 0x2201: 10, 0x8060: 13 })[(params[0] << 8) | params[1]] || 0];
      else if (feature === 10 && fn === 1) result = [0, 0, 100, 0xe0, 50, 0x1f, 0x40, 0, 0];
      else if (feature === 10 && fn === 2) result = [0, this.dpi >> 8, this.dpi & 255, 3, 32];
      else if (feature === 10 && fn === 3) { this.dpi = (params[1] << 8) | params[2]; result = []; }
      else if (feature === 13 && fn === 0) result = [0x8b];
      else if (feature === 13 && fn === 1) result = [this.period];
      else if (feature === 13 && fn === 2) { this.period = params[0]; result = []; }
      else throw new Error(`Unexpected request ${feature}:${fn}`);
      const bytes = Uint8Array.from([device, feature, command, ...result, ...Array(16).fill(0)]);
      const event = new Event('inputreport');
      event.reportId = id;
      event.data = new DataView(bytes.buffer);
      queueMicrotask(() => this.dispatchEvent(event));
    }
  }
  const mouse = new Mouse();
  const client = new Hidpp(mouse);
  await client.connect();
  const dpi = await client.readDpi();
  assert.equal(dpi.current, 800);
  assert.equal(dpi.max, 8000);
  assert.equal((await client.setDpi(dpi, 1620)).current, 1600);
  const rate = await client.readRate();
  assert.deepEqual(rate.rates, [125, 250, 500, 1000]);
  assert.equal((await client.setRate(rate, 500)).current, 500);
  await client.close();
  assert.equal(mouse.opened, false);
});
