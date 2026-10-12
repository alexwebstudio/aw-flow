/* Форматирование цен услуг. Единый источник — content/services.json.
   У услуг с полем `price` цена задана диапазонами для «Код» и «Tilda»
   в ₸ и ₽; у остальных (например, пригласительное) остаются строки rub/kzt. */

export const nf = n => n.toLocaleString('ru-RU').replace(/ /g, ' '); // 75000 → "75 000"
export const rangeStr = ([a, b], cur) => `${nf(a)}–${nf(b)} ${cur}`;

/* Стартовая цена для компактных карточек: минимум из доступных вариантов
   (у части услуг есть только «Код», напр. SaaS). */
export function priceFrom(s) {
  if (!s.price) return { kzt: s.kzt || '', rub: s.rub || '' };
  const kzts = [s.price.code?.kzt[0], s.price.tilda?.kzt[0]].filter(n => Number.isFinite(n));
  const rubs = [s.price.code?.rub[0], s.price.tilda?.rub[0]].filter(n => Number.isFinite(n));
  return { kzt: `от ${nf(Math.min(...kzts))} ₸`, rub: `от ${nf(Math.min(...rubs))} ₽` };
}

/* Полная раскладка цены для страницы услуги. Возвращает строки под форматы,
   пропуская формат, которого у услуги нет. */
export function priceRows(s) {
  if (!s.price) {
    return [
      { label: 'Цена, ₸', value: s.kzt || '' },
      { label: 'Цена, ₽', value: s.rub || '' },
    ].filter(r => r.value);
  }
  const p = s.price;
  const rows = [];
  if (p.code) {
    rows.push({ label: 'На коде, ₸', value: rangeStr(p.code.kzt, '₸') });
    rows.push({ label: 'На коде, ₽', value: rangeStr(p.code.rub, '₽') });
  }
  if (p.tilda) {
    rows.push({ label: 'На Tilda, ₸', value: rangeStr(p.tilda.kzt, '₸') });
    rows.push({ label: 'На Tilda, ₽', value: rangeStr(p.tilda.rub, '₽') });
  }
  return rows;
}
