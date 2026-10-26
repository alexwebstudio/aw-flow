'use client';
/* AW-Flow: конструктор эффекта. Контролы строятся из описания params
   в content/aw-flow.json: range — слайдер, select — список, toggle —
   переключатель, seg — сегменты, color — цвет, text — строка.
   Сверху — пресеты и CSS-класс, снизу — отдельные значения для мобильных.
   На мобильном панель сворачивается кнопкой в заголовке. */
import { useId, useState } from 'react';
import { IconChevron } from './Icons';
import { hasMobile, isVisible, matchPreset } from '@/lib/aw-flow';
import { isValidClass, MOBILE_BP, parseBezier } from '@/lib/fx/code';

const decimals = step => (String(step).split('.')[1] || '').length;
export const fmtValue = (p, val) => (p.type === 'range' ? Number(val).toFixed(decimals(p.step)) : String(val));

function Range({ p, id, value, onChange }) {
  const pct = ((value - p.min) / (p.max - p.min)) * 100;
  const text = `${fmtValue(p, value)}${p.unit ? ' ' + p.unit : ''}`;
  return (
    <div className="field fx-field">
      <div className="fx-f-head">
        <label className="f-lab" htmlFor={id}>{p.label}</label>
        <output className="fx-out" htmlFor={id}>{fmtValue(p, value)}{p.unit ? <span>{p.unit}</span> : null}</output>
      </div>
      <input id={id} type="range" min={p.min} max={p.max} step={p.step} value={value}
        style={{ '--p': `${Math.min(100, Math.max(0, pct))}%` }}
        aria-valuetext={text}
        onChange={e => onChange(p.key, Number(e.target.value))} />
      <div className="fx-f-scale" aria-hidden="true"><span>{p.min}</span><span>{p.max}</span></div>
    </div>
  );
}

function Select({ p, id, value, onChange }) {
  return (
    <div className="field fx-field">
      <label className="f-lab" htmlFor={id}>{p.label}</label>
      <select id={id} className="select" value={value} onChange={e => onChange(p.key, e.target.value)}>
        {p.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ p, value, onChange }) {
  return (
    <div className="fx-field fx-field-toggle">
      <label className="toggle">
        <input type="checkbox" checked={!!value} onChange={e => onChange(p.key, e.target.checked)} />
        <span className="tr" aria-hidden="true" />
        {p.label}
      </label>
    </div>
  );
}

function Seg({ p, id, value, onChange }) {
  return (
    <fieldset className="field fx-field fx-fieldset">
      <legend className="f-lab">{p.label}</legend>
      <div className="seg fx-seg">
        {p.options.map(o => (
          <label key={o.value}>
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(p.key, o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Color({ p, id, value, onChange }) {
  return (
    <div className="field fx-field">
      <div className="fx-f-head">
        <label className="f-lab" htmlFor={id}>{p.label}</label>
        <output className="fx-out" htmlFor={id}>{String(value).toUpperCase()}</output>
      </div>
      <input id={id} type="color" className="fx-color" value={value} onChange={e => onChange(p.key, e.target.value)} />
    </div>
  );
}

function Text({ p, id, value, onChange }) {
  const invalid = p.key === 'bezier' && !parseBezier(value);
  return (
    <div className={`field fx-field${invalid ? ' err' : ''}`}>
      <label className="f-lab" htmlFor={id}>{p.label}</label>
      <input id={id} type="text" className="input" value={value} placeholder={p.placeholder || ''} maxLength={60}
        spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined}
        onChange={e => onChange(p.key, e.target.value)} />
      {invalid && <p className="f-err" id={`${id}-err`}>Четыре числа через запятую, x1 и x2 — от 0 до 1. Пока используется power3.out.</p>}
    </div>
  );
}

const CONTROLS = { range: Range, select: Select, toggle: Toggle, seg: Seg, color: Color, text: Text };

export default function FxControls({ fx, values, defaults, onChange, onMobile, onMobileToggle, onPreset, onReset }) {
  const uid = useId();
  const [open, setOpen] = useState(true);
  const bodyId = `${uid}-body`;
  const visible = fx.params.filter(p => isVisible(p, values));
  const main = visible.filter(p => p.type !== 'toggle');
  const flags = visible.filter(p => p.type === 'toggle');
  const mobileParams = visible.filter(p => p.m);
  const current = matchPreset(fx, values);
  const changed = JSON.stringify(values) !== JSON.stringify(defaults);
  const site = fx.scope === 'site';
  const clsOk = isValidClass(values.cls);

  const render = (p, val, handler, prefix = '') => {
    const C = CONTROLS[p.type];
    return C ? <C key={prefix + p.key} p={p} id={`${uid}-${prefix}${p.key}`} value={val} onChange={handler} /> : null;
  };

  return (
    <aside className={`fx-panel${open ? '' : ' is-collapsed'}`} aria-label="Настройки эффекта">
      <div className="fx-panel-head">
        <button type="button" className="fx-panel-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
          <span className="label">Конструктор</span>
          <span className="fx-panel-count">{fx.params.length}</span>
          <IconChevron className="fx-panel-chev" />
        </button>
        <button type="button" className="fx-reset" onClick={onReset} disabled={!changed}>Сбросить</button>
      </div>

      <div className="fx-panel-body" id={bodyId}>
        <div className="fx-group">
          <p className="fx-group-t" id={`${uid}-presets`}>Пресеты</p>
          <div className="fx-presets" role="group" aria-labelledby={`${uid}-presets`}>
            {fx.presets.map(pr => (
              <button key={pr.id} type="button" className="fx-preset" aria-pressed={current === pr.id} onClick={() => onPreset(pr.id)}>
                {pr.label}
              </button>
            ))}
            <span className={`fx-preset is-custom${current ? '' : ' is-on'}`}>Свой вариант</span>
          </div>
        </div>

        <div className={`field fx-field${clsOk ? '' : ' err'}`}>
          <label className="f-lab" htmlFor={`${uid}-cls`}>{site ? 'Префикс классов' : 'CSS-класс элемента'}</label>
          <input id={`${uid}-cls`} type="text" className="input fx-cls" value={values.cls} maxLength={40} spellCheck={false}
            aria-invalid={!clsOk || undefined} aria-describedby={`${uid}-cls-hint`}
            onChange={e => onChange('cls', e.target.value.trim())} />
          <p className={clsOk ? 'fx-hint' : 'f-err'} id={`${uid}-cls-hint`}>
            {clsOk
              ? (site ? 'Используется для внутренних элементов эффекта. Обычно менять не нужно.' : 'Без точки. Для другого набора настроек задайте другой класс, например awf-' + fx.slug + '-2.')
              : 'Латиница, цифры и дефис, первая — буква. Пока в коде остаётся класс по умолчанию.'}
          </p>
        </div>

        {main.map(p => render(p, values[p.key], onChange))}
        {flags.length > 0 && <div className="fx-flags">{flags.map(p => render(p, values[p.key], onChange))}</div>}

        {hasMobile(fx) && mobileParams.length > 0 && (
          <fieldset className="fx-mobile">
            <legend className="fx-group-t">Мобильные — до {MOBILE_BP}px</legend>
            <label className="toggle">
              <input type="checkbox" checked={!!values.mobileOn} onChange={e => onMobileToggle(e.target.checked)} />
              <span className="tr" aria-hidden="true" />
              Задать отдельно для телефонов
            </label>
            {values.mobileOn ? (
              <div className="fx-mobile-body">
                {mobileParams.map(p => render(p, values.m?.[p.key] ?? values[p.key], onMobile, 'm-'))}
              </div>
            ) : (
              <p className="fx-hint">Сейчас на телефонах используются те же значения, что и на десктопе.</p>
            )}
          </fieldset>
        )}
      </div>
    </aside>
  );
}
