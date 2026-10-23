/* Форматирование цен услуг (только в долларах). Единый источник —
   content/services.json, поле `usd`:
   - { code: [min,max], tilda: [min,max] } — диапазоны по форматам;
   - { from: N } — одна стартовая цена «от $N» (напр. пригласительное). */

const usdRange = ([a, b]) => `$${a} – $${b}`;

/* Стартовая цена для компактных карточек.
   Возвращает { main, sub }: main — крупная строка «от …», sub — под ней. */
export function priceFrom(s) {
  if (!s.usd) return { main: '', sub: s.term || '' };
  if (s.usd.from != null) return { main: `от $${s.usd.from}`, sub: s.term };
  const mins = [s.usd.code?.[0], s.usd.tilda?.[0]].filter(n => Number.isFinite(n));
  return { main: `от $${Math.min(...mins)}`, sub: s.term };
}

/* Полная раскладка цены для страницы услуги. */
export function priceRows(s) {
  if (!s.usd) return [];
  if (s.usd.from != null) return [{ label: 'Цена', value: `от $${s.usd.from}` }];
  const rows = [];
  if (s.usd.code) rows.push({ label: 'На коде', value: usdRange(s.usd.code) });
  if (s.usd.tilda) rows.push({ label: 'На Тильде', value: usdRange(s.usd.tilda) });
  return rows;
}
