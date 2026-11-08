import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hidpp, dpiValues } from './hidpp.js';

test('DPI ranges contain all valid steps across segment boundaries', () => {
  assert.deepEqual(dpiValues([0, 100, 0xe0, 50, 1, 44, 0xe0, 100, 2, 88, 0, 0]), [100, 150, 200, 250, 300, 400, 500, 600]);
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
