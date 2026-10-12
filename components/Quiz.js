'use client';
/* Квиз «Обсудить проект»: шаги слева, живое превью заявки справа.
   Ответы сохраняются в sessionStorage, можно вернуться и изменить.
   Первый шаг — направление (компактный список), дальше шаги зависят от выбора:
   для сайтов — формат/что есть, для доработки и SEO — свои вопросы. Финал
   (контакты и отправка) общий для всех. */
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import quiz from '@/content/quiz.json';
import settings from '@/content/settings.json';
import { prefersReduced, scrollToTarget, session } from '@/lib/client';
import { CONTACT_KINDS, checkContact, sendLead } from '@/lib/lead';
import { ContactFields, LeadFallback, LeadSuccess } from './LeadParts';
import { IconArrow, IconChevron, socialList } from './Icons';

const KEY = 'aws-brief';
const INIT = {
  cat: '', type: '', format: '', assets: [], revWhat: [], base: '',
  timing: '', budget: '', about: '', examples: '', name: '', kind: 'telegram', contact: '', trap: '',
};

/* ключ категории по её названию */
const CAT_KEY = Object.fromEntries(quiz.cats.map(c => [c.v, c.key]));

/* предвыбор из ?type=<услуга>: сопоставляем услугу с категорией квиза */
const SITE_TYPES = new Set(quiz.siteTypes.map(t => t.v));
const TYPE_TO_STATE = {
  'Разработка SaaS-проекта': { cat: 'SaaS-проект' },
  'Доработка существующего сайта': { cat: 'Доработка существующего сайта' },
  'Базовая SEO-оптимизация сайта': { cat: 'SEO-оптимизация' },
};
quiz.siteTypes.forEach(t => { TYPE_TO_STATE[t.v] = { cat: 'Сайт под ключ', type: t.v }; });

/* определения шагов */
const S = {
  cat: { key: 'cat', label: 'Направление', title: 'Что вам нужно?', sub: 'Выберите направление — его можно поменять в любой момент.', input: 'radio', options: quiz.cats, required: true, list: true },
  type: { key: 'type', label: 'Тип сайта', title: 'Какой сайт нужен?', sub: 'Выберите формат — внутри можно изменить.', input: 'radio', options: quiz.siteTypes, required: true },
  format: { key: 'format', label: 'Формат', title: 'Как сделать сайт?', sub: 'Если не уверены — выберите «Не знаю», подскажу.', input: 'radio', options: quiz.formats, required: true },
  assets: { key: 'assets', label: 'Что уже есть', title: 'Что у вас уже есть?', sub: 'Можно выбрать несколько вариантов или пропустить шаг.', input: 'checkbox', options: quiz.assets.map(v => ({ v })) },
  revWhat: { key: 'revWhat', label: 'Что доработать', title: 'Что нужно доработать?', sub: 'Выберите, что ближе к задаче — можно несколько.', input: 'checkbox', options: quiz.revWhat.map(v => ({ v })) },
  base: { key: 'base', label: 'Сайт на', title: 'На чём сделан сайт?', sub: 'Если не знаете — выберите «Другое / не знаю».', input: 'radio', options: quiz.siteBase.map(v => ({ v })), required: true },
  timing: { key: 'timing', label: 'Сроки', title: 'Когда нужен результат?', sub: 'Это поможет спланировать работу.', input: 'radio', options: quiz.timing.map(v => ({ v })), required: true },
  budget: { key: 'budget', label: 'Бюджет', title: 'Какой бюджет рассматриваете?', sub: 'Ориентир поможет предложить подходящий формат.', input: 'radio', options: quiz.budgets.map(v => ({ v })), required: true },
  about: { key: 'about', label: 'О проекте', title: 'Коротко о проекте', sub: 'Чем занимаетесь и какая задача у проекта. Шаг можно пропустить.', input: 'text' },
  contacts: { key: 'contacts', label: 'Контакты', title: 'Куда прислать ответ?', sub: 'Отвечаю в течение нескольких часов.', input: 'contacts', required: true },
};

/* набор шагов зависит от выбранной категории; финал (about → contacts) общий */
function buildSteps(cat) {
  const key = CAT_KEY[cat];
  const tail = [S.timing, S.budget, S.about, S.contacts];
  if (key === 'site') return [S.cat, S.type, S.format, S.assets, ...tail];
  if (key === 'saas') return [S.cat, S.assets, ...tail];
  if (key === 'revision') return [S.cat, S.revWhat, S.base, ...tail];
  if (key === 'seo') return [S.cat, S.base, ...tail];
  if (key === 'other') return [S.cat, S.format, S.assets, ...tail];
  return [S.cat, S.format, S.assets, ...tail]; // пока категория не выбрана — ориентировочный счётчик
}

function display(a, key) {
  if (key === 'assets') return a.assets.join(', ');
  if (key === 'revWhat') return a.revWhat.join(', ');
  if (key === 'about') return [a.about, a.examples && `Примеры: ${a.examples}`].filter(Boolean).join(' · ');
  if (key === 'contacts') return [a.name, a.contact && `${CONTACT_KINDS[a.kind].label}: ${a.contact}`].filter(Boolean).join(' · ');
  return a[key];
}

export default function Quiz() {
  const [a, setA] = useState(INIT);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done | failed
  const [sheet, setSheet] = useState(false);
  const [flash, setFlash] = useState('');
  const [loaded, setLoaded] = useState(false);
  const stepRef = useRef(null);
  const titleRef = useRef(null);
  const dir = useRef(1);
  const userNav = useRef(false);
  const cardRef = useRef(null);

  /* шаги пересобираются при смене направления */
  const STEPS = useMemo(() => buildSteps(a.cat), [a.cat]);

  /* если число шагов уменьшилось (сменили направление) — не выходим за пределы */
  useEffect(() => { setStep(s => Math.min(s, STEPS.length - 1)); }, [STEPS.length]);

  /* восстановление ответов и предвыбор направления из ?type= */
  useEffect(() => {
    const saved = session.get(KEY);
    let next = saved?.a ? { ...INIT, ...saved.a, trap: '' } : INIT;
    if (next.type && !next.cat && TYPE_TO_STATE[next.type]) next = { ...next, ...TYPE_TO_STATE[next.type] };
    const t = new URLSearchParams(location.search).get('type');
    if (t && TYPE_TO_STATE[t]) next = { ...next, ...TYPE_TO_STATE[t] };
    setA(next);
    if (saved && typeof saved.step === 'number') setStep(Math.min(saved.step, buildSteps(next.cat).length - 1));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded && state !== 'done') session.set(KEY, { a: { ...a, trap: '' }, step }); }, [a, step, loaded, state]);

  /* анимация смены шага и фокус на заголовок шага */
  useEffect(() => {
    if (!loaded) return;
    if (userNav.current) titleRef.current?.focus({ preventScroll: true });
    if (prefersReduced() || !stepRef.current) return;
    const t = gsap.fromTo(stepRef.current, { opacity: 0, x: 26 * dir.current }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
    return () => t.kill();
  }, [step, loaded]);

  const update = (key, value, previewKey = key) => {
    setA(v => {
      const next = { ...v, [key]: value };
      // смена направления обнуляет ответы предыдущей ветки, чтобы в заявку не попало лишнее
      if (key === 'cat') { next.type = ''; next.format = ''; next.assets = []; next.revWhat = []; next.base = ''; }
      return next;
    });
    setError('');
    setFlash(previewKey);
    setTimeout(() => setFlash(f => (f === previewKey ? '' : f)), 700);
  };

  const toggleMulti = (key, v) => {
    let list = a[key].includes(v) ? a[key].filter(x => x !== v) : [...a[key], v];
    if (key === 'assets') {
      if (v === 'Пока ничего' && list.includes(v)) list = [v];
      else list = list.filter(x => x !== 'Пока ничего' || v === 'Пока ничего');
    }
    update(key, list);
  };

  const cur = STEPS[step] || STEPS[STEPS.length - 1];

  const validate = () => {
    if (cur.input === 'contacts') {
      const e = { name: a.name.trim().length < 2, contact: !checkContact(a.kind, a.contact) };
      setFieldErr(e);
      if (e.name) document.getElementById('q-name')?.focus();
      else if (e.contact) document.getElementById('q-contact')?.focus();
      return !e.name && !e.contact;
    }
    if (cur.required && !a[cur.key]) { setError('Выберите один из вариантов, чтобы продолжить.'); return false; }
    return true;
  };

  const go = n => {
    dir.current = n > step ? 1 : -1;
    userNav.current = true;
    setError('');
    setStep(n);
    if (cardRef.current && cardRef.current.getBoundingClientRect().top < 0) scrollToTarget(cardRef.current);
  };

  const rows = () => {
    const r = [['Направление', a.cat]];
    if (a.type) r.push(['Тип сайта', a.type]);
    if (a.format) r.push(['Формат', a.format]);
    if (a.assets.length) r.push(['Что уже есть', a.assets.join(', ')]);
    if (a.revWhat.length) r.push(['Что доработать', a.revWhat.join(', ')]);
    if (a.base) r.push(['Сайт сделан', a.base]);
    r.push(['Сроки', a.timing], ['Бюджет', a.budget]);
    if (a.about.trim()) r.push(['О проекте', a.about.trim()]);
    if (a.examples.trim()) r.push(['Примеры', a.examples.trim()]);
    r.push(['Имя', a.name.trim()], [CONTACT_KINDS[a.kind].label, a.contact.trim()]);
    return r;
  };

  const next = async e => {
    e.preventDefault();
    if (!validate()) return;
    if (step < STEPS.length - 1) { go(step + 1); return; }
    setState('sending');
    try {
      await sendLead({ source: 'brief', title: 'Новая заявка с сайта', rows: rows(), trap: a.trap });
      setState('done');
      session.del(KEY);
    } catch {
      setState('failed');
    }
  };

  const filled = STEPS.filter(s => display(a, s.key)).length;
  const socials = socialList(settings.contacts, ['telegram', 'whatsapp']);

  return (
    <div className="quiz-layout">
      <div className="q-card" ref={cardRef}>
        {state === 'done' ? (
          <LeadSuccess title="Спасибо! Скоро напишу" text={`Заявка у меня. Отвечу в ${CONTACT_KINDS[a.kind].label} в течение нескольких часов.`} />
        ) : (
          <form onSubmit={next} noValidate>
            <div className="q-top">
              <span>Шаг {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
              <div className="q-pixels" role="progressbar" aria-label="Прогресс квиза" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
                {STEPS.map((s, i) => <i key={s.key} className={i === step ? 'cur' : i < step ? 'done' : ''} />)}
              </div>
            </div>

            <div ref={stepRef} className="q-step">
              <fieldset>
                <legend className="q-title" ref={titleRef} tabIndex={-1}>{cur.title}</legend>
                <p className="q-sub">{cur.sub}</p>

                {(cur.input === 'radio' || cur.input === 'checkbox') && (
                  <div className={`q-opts${cur.list ? ' q-opts-list' : ''}`}>
                    {cur.options.map(o => {
                      const checked = cur.input === 'radio' ? a[cur.key] === o.v : a[cur.key].includes(o.v);
                      return (
                        <label key={o.v} className="q-opt">
                          <input type={cur.input} name={cur.key} value={o.v} checked={checked}
                            onChange={() => (cur.input === 'radio' ? update(cur.key, o.v) : toggleMulti(cur.key, o.v))} />
                          <span className="box"><span className="mark" aria-hidden="true" /><span><span className="t">{o.v}</span>{o.d && <span className="d">{o.d}</span>}</span></span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {cur.input === 'text' && (
                  <>
                    <div className="field">
                      <label className="f-lab" htmlFor="q-about">О задаче <span className="opt">— по желанию</span></label>
                      <textarea id="q-about" className="textarea" placeholder="Например: у нас кофейня, хотим принимать заказы на сайте" value={a.about} onChange={e => update('about', e.target.value)} maxLength={1500} />
                    </div>
                    <div className="field">
                      <label className="f-lab" htmlFor="q-examples">Сайты, которые нравятся <span className="opt">— по желанию</span></label>
                      <input id="q-examples" className="input" placeholder="Ссылки или названия" value={a.examples} onChange={e => update('examples', e.target.value, 'about')} maxLength={500} />
                    </div>
                  </>
                )}

                {cur.input === 'contacts' && (
                  <>
                    <input className="trap" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company" value={a.trap} onChange={e => setA(v => ({ ...v, trap: e.target.value }))} />
                    <div className={`field${fieldErr.name ? ' err' : ''}`}>
                      <label className="f-lab" htmlFor="q-name">Как к вам обращаться *</label>
                      <input id="q-name" className="input" autoComplete="name" value={a.name} aria-invalid={!!fieldErr.name} aria-describedby={fieldErr.name ? 'q-name-err' : undefined}
                        onChange={e => { update('name', e.target.value, 'contacts'); setFieldErr(x => ({ ...x, name: false })); }} />
                      {fieldErr.name && <p className="f-err" id="q-name-err">Укажите имя</p>}
                    </div>
                    <ContactFields idPrefix="q" kind={a.kind} value={a.contact} error={fieldErr.contact}
                      setKind={k => { update('kind', k, 'contacts'); setFieldErr(x => ({ ...x, contact: false })); }}
                      setValue={v => { update('contact', v, 'contacts'); setFieldErr(x => ({ ...x, contact: false })); }} />
                    <p className="form-consent">Отправляя заявку, вы соглашаетесь с <a href="/privacy" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</a>.</p>
                  </>
                )}
              </fieldset>
              {error && <p className="q-err" role="alert">{error}</p>}
              {!cur.required && <p className="q-hint">Этот шаг необязательный — можно нажать «Далее».</p>}
            </div>

            <div className="q-nav">
              <button type="button" className="q-back" onClick={() => go(step - 1)} hidden={step === 0}><IconArrow /> Назад</button>
              <button type="submit" className="btn btn-primary" disabled={state === 'sending'} aria-busy={state === 'sending'}>
                {state === 'sending' ? <><span className="spinner" aria-hidden="true" /> Отправляю…</>
                  : step === STEPS.length - 1 ? <>Отправить заявку <IconArrow /></> : <>Далее <IconArrow /></>}
              </button>
            </div>
            {state === 'failed' && <LeadFallback title="Новая заявка с сайта" rows={rows()} />}
          </form>
        )}
      </div>

      <aside className={`q-aside${sheet ? ' open' : ''}`} aria-label="Ваша заявка">
        <div className="q-preview" id="q-preview" data-lenis-prevent="">
          <div className="qp-head"><span>{state === 'done' ? 'Заявка отправлена' : 'Ваша заявка'}</span><span>{filled} / {STEPS.length}</span></div>
          <p className="qp-note">Обновляется по мере ответов. Любой пункт можно изменить — нажмите на него.</p>
          <dl className="qp-list">
            {STEPS.map((s, i) => {
              const v = display(a, s.key);
              return (
                <div key={s.key} className={`qp-row${flash === s.key ? ' flash' : ''}${i === step && state !== 'done' ? ' cur' : ''}`}>
                  <dt>{s.label}</dt>
                  <dd className={v ? '' : 'empty'}>
                    {state === 'done' ? (v || '—') : (
                      <button type="button" onClick={() => { go(i); setSheet(false); }} style={{ textAlign: 'left', color: 'inherit' }}>
                        {v || '—'}<span className="sr-only"> — изменить</span>
                      </button>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="qp-contact">
            Удобнее написать сразу?
            <div className="soc">
              {socials.map(({ key, url, label, Icon }) => <a key={key} className="soc-ic" href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon /></a>)}
            </div>
          </div>
        </div>
        <button type="button" className="qp-toggle" aria-expanded={sheet} aria-controls="q-preview" onClick={() => setSheet(s => !s)}>
          <span>Ваша заявка <span className="c">· {filled} из {STEPS.length}</span></span>
          <IconChevron />
        </button>
      </aside>
    </div>
  );
}
