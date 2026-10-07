'use client';
/* Отправка заявок на сервер (/api/lead → Telegram).
   rows — массив пар [подпись, значение]. */

export function leadText(title, rows) {
  return title + '\n\n' +
    rows.filter(r => r[1] && String(r[1]).trim()).map(r => r[0] + ': ' + r[1]).join('\n');
}

export async function sendLead({ source, title, rows, trap = '' }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, title, rows, company: trap, page: location.href }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const err = new Error(data.error || 'failed');
      err.code = data.error || 'failed';
      throw err;
    }
    return true;
  } finally {
    clearTimeout(t);
  }
}

/* Маска телефона +7 (___) ___-__-__ для РФ/РК (оба — +7).
   Пустое значение оставляем пустым, чтобы поле можно было очистить. */
export function maskPhone(raw) {
  // Сначала убираем уже добавленный визуальный префикс «+7 (»: иначе его цифра
  // «7» считается частью номера при каждом новом вводе (поле контролируемое и
  // маска применяется поверх уже отформатированного значения) — и номер
  // «разрастается» в 7777…. Благодаря этому маска идемпотентна.
  const s = String(raw || '').replace(/^\s*\+\s*7\s*\(?/, '');
  let d = s.replace(/\D/g, '');
  // если номер ввели/вставили целиком с кодом страны (11 цифр, 7 или 8) —
  // убираем код страны, чтобы остался 10-значный национальный номер
  if (d.length > 10 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return '';
  let out = '+7 (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}
export const isPhoneKind = kind => kind === 'whatsapp' || kind === 'phone';

/* простая проверка контакта по выбранному способу связи */
export function checkContact(kind, value) {
  const v = (value || '').trim();
  const digits = v.replace(/\D/g, '');
  if (!v) return false;
  if (kind === 'telegram') return /^@?[a-zA-Z0-9_]{4,32}$/.test(v) || (digits.length >= 10 && digits.length <= 15);
  return digits.length >= 10 && digits.length <= 15;
}

export const CONTACT_KINDS = {
  telegram: { label: 'Telegram', placeholder: '@username или номер телефона', type: 'text', inputMode: 'text',
    error: 'Укажите @username (от 4 символов) или номер телефона' },
  whatsapp: { label: 'WhatsApp', placeholder: '+7 (___) ___-__-__', type: 'tel', inputMode: 'tel',
    error: 'Укажите корректный номер WhatsApp' },
  phone: { label: 'Телефон', placeholder: '+7 (___) ___-__-__', type: 'tel', inputMode: 'tel',
    error: 'Укажите корректный номер телефона' },
};
