import { Hidpp, LOGITECH } from './hidpp.js';

const $ = id => document.getElementById(id);
let client = null;
let dpi = null;
let rate = null;
let busy = false;

function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}

function controls() {
  $('connect').disabled = busy || !navigator.hid;
  $('connect').hidden = !!client;
  $('disconnect').hidden = !client;
  $('disconnect').disabled = busy;
  $('dpi').disabled = busy || !dpi;
  $('apply-dpi').disabled = busy || !dpi;
  $('rate').disabled = busy || !rate;
  $('apply-rate').disabled = busy || !rate;
}

function renderDpi() {
  $('dpi').value = dpi?.current ?? '';
  $('dpi').min = dpi?.min ?? '';
  $('dpi').max = dpi?.max ?? '';
  $('dpi-range').textContent = dpi ? `${dpi.min.toLocaleString('ru-RU')}–${dpi.max.toLocaleString('ru-RU')} DPI` : '—';
  $('dpi-current').textContent = dpi ? `Текущее значение: ${dpi.current.toLocaleString('ru-RU')} DPI` : 'Регулировка DPI не найдена у этого устройства.';
}

function renderRate() {
  $('rate').replaceChildren();
  if (!rate) $('rate').add(new Option('Нет данных', ''));
  else for (const hz of [...rate.rates].sort((a, b) => b - a)) $('rate').add(new Option(`${hz} Гц`, String(hz), hz === rate.current, hz === rate.current));
  $('rate-current').textContent = rate ? `Текущее значение: ${rate.current} Гц` : 'Регулировка частоты опроса не найдена у этого устройства.';
}

async function reset() {
  const old = client;
  client = null; dpi = null; rate = null;
  if (old) await old.close().catch(() => {});
  $('status').textContent = 'Не подключено';
  $('status-dot').classList.remove('online');
  $('device-heading').textContent = 'Мышь не выбрана';
  $('device-detail').textContent = 'Подключите мышь или её приёмник к компьютеру.';
  $('dpi').value = '';
  $('dpi-range').textContent = '—';
  $('dpi-current').textContent = 'Подключите устройство, чтобы узнать текущее значение.';
  $('rate').replaceChildren(new Option('Нет данных', ''));
  $('rate-current').textContent = 'Доступные значения зависят от модели и подключения.';
  controls();
}

$('connect').addEventListener('click', async () => {
  // requestDevice must be called directly from the user's click.
  let selected;
  try { selected = await navigator.hid.requestDevice({ filters: [{ vendorId: LOGITECH, usagePage: 0xff00 }] }); }
  catch (error) { message(`Не удалось открыть выбор устройства: ${error.message}`, true); return; }
  if (!selected.length) return;
  busy = true; controls(); message('Подключаемся и читаем настройки…');
  const candidate = new Hidpp(selected[0]);
  try {
    await candidate.connect();
    client = candidate;
    $('device-heading').textContent = selected[0].productName || 'Logitech HID++';
    $('device-detail').textContent = candidate.index === 0xff ? 'Подключено напрямую' : `Подключено через приёмник · слот ${candidate.index}`;
    $('status').textContent = 'Подключено'; $('status-dot').classList.add('online');
    const errors = [];
    try { dpi = await candidate.readDpi(); } catch (error) { errors.push(`DPI: ${error.message}`); }
    try { rate = await candidate.readRate(); } catch (error) { errors.push(`Частота: ${error.message}`); }
    renderDpi(); renderRate();
    message(errors.length ? errors.join(' · ') : 'Настройки прочитаны. Некоторые устройства разрешают изменение только в режиме хоста.', errors.length > 0);
  } catch (error) {
    await candidate.close().catch(() => {});
    message(`Не удалось подключиться: ${error.message}`, true);
  } finally { busy = false; controls(); }
});

$('disconnect').addEventListener('click', async () => { await reset(); message('Устройство отключено.'); });
$('apply-dpi').addEventListener('click', async () => {
  const value = Number($('dpi').value);
  if (!Number.isFinite(value) || !$('dpi').value || value < dpi.min || value > dpi.max) { message('Введите DPI в указанном диапазоне.', true); return; }
  busy = true; controls();
  try { dpi = await client.setDpi(dpi, value); renderDpi(); message(`Текущий DPI: ${dpi.current}.`); }
  catch (error) { message(`Не удалось изменить DPI: ${error.message}. Проверьте режим памяти устройства.`, true); }
  finally { busy = false; controls(); }
});
$('apply-rate').addEventListener('click', async () => {
  busy = true; controls();
  try { rate = await client.setRate(rate, Number($('rate').value)); renderRate(); message(`Текущая частота: ${rate.current} Гц.`); }
  catch (error) { message(`Не удалось изменить частоту: ${error.message}. Проверьте режим памяти устройства.`, true); }
  finally { busy = false; controls(); }
});

if (!navigator.hid) $('browser-notice').hidden = false;
else navigator.hid.addEventListener('disconnect', event => {
  if (client?.device === event.device) reset().then(() => message('Устройство отключено.'));
});
controls();
