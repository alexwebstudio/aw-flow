'use client';
/* AW-Flow: страница эффекта — (1) живое превью, (2) конструктор,
   (3) готовый код, (4) установка в Tilda. Превью и код строятся из одних
   и тех же значений (buildCode): что видно в превью — то и копируется. */
import { useEffect, useMemo, useState } from 'react';
import FxFrame from './FxFrame';
import FxControls from './FxControls';
import Heading from './Heading';
import Reveal from './Reveal';
import { fxDefaults, presetValues } from '@/lib/aw-flow';
import { buildCode, classOf } from '@/lib/fx/code';
import { copyText } from '@/lib/client';

function ElementSteps({ fx, C }) {
  return (
    <ol className="fx-steps-list">
      <li>
        <b>Назначьте класс элементу.</b> В Zero Block кликните правой кнопкой по нужному элементу{fx.category === 'text' ? ' — текстовому' : ''} и
        выберите пункт добавления CSS-класса (Add CSS class name). Впишите <code>{C}</code> — без точки. Класс ставится на сам элемент, не на весь артборд.
      </li>
      <li><b>Добавьте HTML-блок.</b> На этой же странице добавьте блок T123 «HTML-код» (проще всего найти поиском в библиотеке блоков) или элемент HTML внутри Zero Block.</li>
      <li><b>Вставьте код.</b> Скопируйте код целиком и вставьте в этот HTML-блок, сохраните и опубликуйте страницу.</li>
      <li><b>Меняете настройки?</b> Сначала удалите старый код этого эффекта, затем вставьте новый и снова опубликуйте страницу.</li>
      <li><b>Разные настройки — разные классы.</b> Для второго варианта на той же странице задайте в конструкторе другой класс, например <code>{C}-2</code>, и вставьте его код отдельно.</li>
    </ol>
  );
}

function SiteSteps({ fx, C }) {
  return (
    <ol className="fx-steps-list">
      <li><b>Откройте вставку кода.</b> «Настройки сайта» → «Вставка кода» → поле «HTML-код для вставки внутрь head».</li>
      <li><b>Вставьте код целиком и сохраните.</b> Код добавляется один раз и работает на всех страницах сайта.</li>
      <li><b>Переопубликуйте все страницы.</b> Без этого код не попадёт на уже опубликованные страницы.</li>
      <li><b>Нужно только на одной странице?</b> Тогда вставьте код в «Настройки страницы» → «Дополнительно» → «HTML-код для вставки внутрь head» и опубликуйте эту страницу.</li>
      <li><b>Хотите поменять вид?</b> Настройте эффект здесь заново и замените старый код новым — цвета, тексты и время уже вшиты в код.</li>
      {fx.slug.startsWith('preloader') && (
        <li><b>Как он работает.</b> Экран загрузки появляется сразу при открытии страницы и сам скрывается после полной загрузки (событие window load), но не раньше минимального времени показа.</li>
      )}
      {fx.slug === 'custom-cursor' && (
        <li><b>Свои элементы.</b> На телефонах и планшетах курсор не включается. Чтобы кольцо увеличивалось над вашим элементом, добавьте ему класс <code>{C}-hover</code>.</li>
      )}
      {fx.slug === 'page-fade' && (
        <li><b>Какие ссылки.</b> Переход срабатывает на внутренних ссылках сайта. Якоря, попапы Tilda (#popup), почта, телефон и ссылки в новой вкладке работают как обычно.</li>
      )}
    </ol>
  );
}

export default function FxStudio({ fx }) {
  const defaults = useMemo(() => fxDefaults(fx), [fx]);
  const [values, setValues] = useState(defaults);
  const [device, setDevice] = useState('desktop');
  const [replay, setReplay] = useState(0);
  const [copied, setCopied] = useState('');

  /* на узком экране сразу показываем мобильный вьюпорт — десктопное превью там слишком мелкое */
  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) setDevice('mobile');
  }, []);

  const code = useMemo(() => buildCode(fx, values), [fx, values]);
  const C = classOf(fx, values);
  const site = fx.scope === 'site';
  const size = useMemo(() => (new Blob([code]).size / 1024).toFixed(1).replace('.', ','), [code]);

  const onChange = (key, val) => setValues(v => ({ ...v, [key]: val }));
  const onMobile = (key, val) => setValues(v => ({ ...v, m: { ...v.m, [key]: val } }));
  const onMobileToggle = on => setValues(v => {
    if (!on) return { ...v, mobileOn: false };
    /* стартовые мобильные значения — от текущих десктопных */
    const m = { ...Object.fromEntries(fx.params.filter(p => p.m).map(p => [p.key, v[p.key]])), ...v.m };
    return { ...v, mobileOn: true, m };
  });
  const onPreset = id => {
    const pr = fx.presets.find(p => p.id === id);
    setValues(v => ({ ...v, ...presetValues(fx, pr) }));
    setReplay(r => r + 1);
  };
  const onReset = () => { setValues(defaults); setReplay(r => r + 1); };
  const onCopy = async () => {
    const ok = await copyText(code);
    setCopied(ok ? 'Код скопирован — вставьте его в Tilda.' : 'Не получилось скопировать автоматически — выделите код и скопируйте вручную.');
    setTimeout(() => setCopied(''), 3500);
  };

  return (
    <>
      <section className="fx-studio-sec" aria-label="Превью и конструктор">
        <div className="wrap fx-studio">
          <div className="fx-stage">
            <div className="fx-stage-bar">
              <div className="fx-device" role="group" aria-label="Размер превью">
                <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Десктоп</button>
                <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Телефон</button>
              </div>
              <span className="fx-stage-meta">{site ? 'весь сайт' : `.${C}`}</span>
              <button type="button" className="fx-replay" onClick={() => setReplay(r => r + 1)}>Повторить</button>
            </div>
            <div className="fx-stage-view">
              <FxFrame fx={fx} values={values} mode="stage" device={device} replay={replay} label={`Превью эффекта AW-Flow — ${fx.name}`} />
            </div>
          </div>
          <FxControls fx={fx} values={values} defaults={defaults} onChange={onChange} onMobile={onMobile}
            onMobileToggle={onMobileToggle} onPreset={onPreset} onReset={onReset} />
        </div>
      </section>

      <section className="section-tight band fx-export" id="code">
        <div className="wrap">
          <div className="s-head">
            <Heading className="h2" text="Готовый *код*" />
            <Reveal as="p" className="s-side">
              Это тот же код, что сейчас работает в превью: значения подставлены из конструктора, внешние библиотеки не нужны.
            </Reveal>
          </div>
          <div className="fx-code">
            <div className="fx-code-bar">
              <span className="fx-code-cls">{site ? 'для всего сайта' : <>класс: <b>{C}</b></>}</span>
              <span className="fx-code-meta">{size} КБ · HTML + CSS + JS</span>
            </div>
            <pre className="fx-code-body" tabIndex={0} aria-label="Код эффекта для вставки в Tilda" data-lenis-prevent=""><code>{code}</code></pre>
            <div className="fx-code-foot">
              <button type="button" className="btn btn-primary btn-sm" onClick={onCopy}>Скопировать код</button>
              <p className="fx-code-note" role="status">{copied || (site ? 'Вставляется один раз — в код всего сайта.' : 'Вставляется в HTML-блок на той же странице, где элемент с классом.')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight fx-install" id="install">
        <div className="wrap fx-install-grid">
          <div>
            <Heading className="h2" text={site ? 'Как *подключить*|в Tilda' : 'Как *добавить*|в Tilda'} />
            <p className="fx-install-lede">
              {site
                ? 'Этот эффект действует на весь сайт, поэтому код вставляется не в блок, а в настройки сайта.'
                : 'Эффект работает на опубликованной странице и в режиме предпросмотра — в самом редакторе Tilda скрипты не выполняются.'}
            </p>
          </div>
          <Reveal className="fx-install-card">
            {site ? <SiteSteps fx={fx} C={C} /> : <ElementSteps fx={fx} C={C} />}
          </Reveal>
        </div>
      </section>
    </>
  );
}
