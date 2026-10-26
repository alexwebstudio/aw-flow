/* AW-Flow: данные каталога из content/aw-flow.json.
   Без fs — модуль работает и на сервере, и в клиентских компонентах.
   Параметры эффектов описываются ссылкой на общий словарь ({ "use": "duration" })
   с переопределениями — здесь они разворачиваются в полные описания. */
import data from '@/content/aw-flow.json';

const resolveParam = p => {
  if (!p.use) return p;
  const { use, ...over } = p;
  return { key: use, ...data.params[use], ...over };
};

const effects = data.effects.map(fx => ({ scope: 'element', ...fx, params: fx.params.map(resolveParam) }));

export const getFxCategories = () => data.categories;
export const getEffects = () => effects;
export const getEffect = slug => effects.find(fx => fx.slug === slug) || null;

export const categoryLabel = id => data.categories.find(c => c.id === id)?.label || id;
export const subLabel = id => (id ? data.subs[id] || id : '');
export const fxTag = fx => [categoryLabel(fx.category), subLabel(fx.sub)].filter(Boolean).join(' · ');

/* триггер по умолчанию: из параметра «Запуск» или из поля trigger эффекта */
export const fxTrigger = fx => fx.params.find(p => p.key === 'trigger')?.default || fx.trigger || 'view';
export const triggerLabel = id => data.triggers[id] || id;

/* параметр виден, если выполнены его условия when: { key: value } */
export const isVisible = (p, v) => !p.when || Object.entries(p.when).every(([k, val]) => v[k] === val);

export const defaultClass = fx => `awf-${fx.slug}`;
export const hasMobile = fx => fx.params.some(p => p.m);

/* значения параметров по умолчанию + служебные поля конструктора */
export function fxDefaults(fx) {
  return {
    cls: defaultClass(fx),
    ...Object.fromEntries(fx.params.map(p => [p.key, p.default])),
    mobileOn: false,
    m: {},
  };
}

/* значения пресета: умолчания эффекта + переопределения пресета */
export function presetValues(fx, preset) {
  return { ...Object.fromEntries(fx.params.map(p => [p.key, p.default])), ...preset.values };
}

/* какой пресет совпадает с текущими значениями (иначе — «свой вариант») */
export function matchPreset(fx, v) {
  return fx.presets.find(pr => {
    const pv = presetValues(fx, pr);
    return fx.params.every(p => !isVisible(p, pv) || pv[p.key] === v[p.key]);
  })?.id || null;
}

/* порядковый номер эффекта в каталоге: 01, 02… */
export const fxIndex = slug => String(effects.findIndex(fx => fx.slug === slug) + 1).padStart(2, '0');
