// HID++ over the browser's WebHID API. All communication stays on this device.
export const LOGITECH = 0x046d;
const LONG = 0x11;
const RATES = [125, 250, 500, 1000, 2000, 4000, 8000];

export class Hidpp {
  constructor(device) {
    this.device = device;
    this.index = 0xff;
    this.features = new Map();
    this.pending = null;
    this.onInput = this.onInput.bind(this);
    device.addEventListener('inputreport', this.onInput);
  }

  onInput(event) {
    if (!this.pending || event.reportId !== LONG) return;
    const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    const p = this.pending;
    if (data.length < 4 || data[0] !== p.index) return;
    if ((data[1] === 0xff || data[1] === 0x8f) && data[2] === p.feature && data[3] === p.command) {
      p.reject(new Error(`Устройство отклонило запрос (HID++ ${data[4]?.toString(16) ?? '?'})`));
    } else if (data[1] === p.feature && data[2] === p.command) {
      p.resolve(data.slice(3));
    }
  }

  async call(feature, fn, params = [], timeout = 1500) {
    if (this.pending) throw new Error('Предыдущий запрос ещё выполняется');
    const command = (fn << 4) | 0x0a;
    const out = new Uint8Array(19);
    out.set([this.index, feature, command, ...params].slice(0, 19));
    let timer;
    const response = new Promise((resolve, reject) => {
      this.pending = { index: this.index, feature, command, resolve, reject };
      timer = setTimeout(() => reject(new Error('Устройство не ответило на запрос HID++')), timeout);
    });
    try {
      await this.device.sendReport(LONG, out);
      return await response;
    } catch (error) {
      // Attach a rejection handler if sendReport fails before the response is awaited.
      response.catch(() => {});
      throw error;
    } finally {
      clearTimeout(timer);
      this.pending = null;
    }
  }

  async connect() {
    await this.device.open();
    for (const index of [0xff, 1, 2, 3, 4, 5, 6]) {
      this.index = index;
      try {
        const reply = await this.call(0, 1, [0, 0, 0x5a], 900);
        if (reply[2] === 0x5a) return;
      } catch { /* Try the next receiver slot. */ }
    }
    throw new Error('Мышь не ответила. Выберите другой интерфейс устройства или разбудите беспроводную мышь.');
  }

  async feature(id) {
    if (this.features.has(id)) return this.features.get(id);
    const p = await this.call(0, 0, [id >> 8, id & 255]);
    const index = p[0] || 0;
    this.features.set(id, index);
    return index;
  }

  async readDpi() {
    const extended = await this.feature(0x2202);
    if (extended) {
      const current = await this.call(extended, 5, [0]);
      const bytes = [];
      for (let page = 0; page < 8; page++) {
        let reply;
        try { reply = await this.call(extended, 2, [0, 0, page]); }
        catch (error) { if (!page) throw error; break; }
        const data = Array.from(reply.slice(3));
        if (data.every(v => v === 0)) break;
        bytes.push(...data);
      }
      const values = dpiValues(bytes);
      if (!values.length || current.length < 10) throw new Error('Не удалось прочитать диапазон DPI');
      return { feature: extended, extended: true, current: word(current, 1), min: values[0], max: values.at(-1), values, lod: current[9] };
    }
    const index = await this.feature(0x2201);
    if (!index) return null;
    const current = await this.call(index, 2, [0]);
    const list = await this.call(index, 1, [0]);
    const values = dpiValues(Array.from(list.slice(1)));
    if (!values.length) throw new Error('Не удалось прочитать диапазон DPI');
    return { feature: index, extended: false, current: word(current, 1), min: values[0], max: values.at(-1), values };
  }

  async setDpi(state, requested) {
    const value = state.values.reduce((best, v) => Math.abs(v - requested) < Math.abs(best - requested) ? v : best);
    const hi = value >> 8, lo = value & 255;
    if (state.extended) await this.call(state.feature, 6, [0, hi, lo, hi, lo, state.lod]);
    else await this.call(state.feature, 3, [0, hi, lo]);
    return this.readDpi();
  }

  async readRate() {
    const connection = this.index === 0xff ? 0 : 1;
    const extended = await this.feature(0x8061);
    if (extended) {
      const list = await this.call(extended, 1, [connection]);
      const current = await this.call(extended, 2, [connection]);
      const rates = RATES.filter((_, i) => list[1] & (1 << i));
      return rates.length && RATES[current[0]] ? { feature: extended, extended: true, connection, rates, current: RATES[current[0]] } : null;
    }
    const index = await this.feature(0x8060);
    if (!index) return null;
    const list = await this.call(index, 0);
    const current = await this.call(index, 1);
    const rates = Array.from({ length: 8 }, (_, i) => i + 1).filter(i => list[0] & (1 << (i - 1))).map(i => Math.floor(1000 / i)).sort((a, b) => a - b);
    return rates.length && current[0] ? { feature: index, extended: false, rates, current: Math.floor(1000 / current[0]) } : null;
  }

  async setRate(state, hz) {
    if (!state.rates.includes(hz)) throw new Error('Частота не поддерживается устройством');
    if (state.extended) await this.call(state.feature, 3, [state.connection, RATES.indexOf(hz)]);
    else await this.call(state.feature, 2, [Math.round(1000 / hz)]);
    return this.readRate();
  }

  async close() {
    this.device.removeEventListener('inputreport', this.onInput);
    if (this.device.opened) await this.device.close();
  }
}

function word(data, offset) { return (data[offset] << 8) | data[offset + 1]; }

export function dpiValues(bytes) {
  const words = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const value = word(bytes, i);
    if (!value) break;
    words.push(value);
  }
  const values = [];
  for (let i = 0; i < words.length;) {
    const start = words[i];
    if (start >= 0xe000) { i++; continue; }
    if (i + 2 < words.length && (words[i + 1] & 0xe000) === 0xe000 && words[i + 2] < 0xe000) {
      const step = words[i + 1] & 0x1fff, end = words[i + 2];
      if (step && end >= start) for (let value = start; value <= end; value += step) values.push(value);
      i += 2;
    } else { values.push(start); i++; }
  }
  return [...new Set(values)].sort((a, b) => a - b);
}
