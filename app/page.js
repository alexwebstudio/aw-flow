import Link from 'next/link';
import Heading from '@/components/Heading';
import Reveal from '@/components/Reveal';
import CtaBand from '@/components/CtaBand';
import FxFrame from '@/components/FxFrame';
import AwFlowCatalog from '@/components/AwFlowCatalog';
import { IconArrow } from '@/components/Icons';
import { defaultClass, fxDefaults, getEffect, getEffects, getFxCategories } from '@/lib/aw-flow';
import { og } from '@/lib/seo';
import { CUSTOM_TEXT } from '@/lib/contact';

export const metadata = {
  alternates: { canonical: '/' },
  openGraph: og('/'),
};

const HERO_FX = 'text-split';

const STEPS = [
  { t: 'Выберите эффект', d: 'Каталог разделён на текст, объекты, интерфейс и фон — у каждого эффекта живое превью.' },
  { t: 'Настройте движение', d: 'Пресет или свои значения: длительность, задержка, смещение, плавность и отдельные настройки для телефонов.' },
  { t: 'Назначьте класс', d: 'В Zero Block дайте нужному элементу CSS-класс эффекта — без точки.' },
  { t: 'Вставьте код', d: 'Скопируйте готовый код в HTML-блок на той же странице и опубликуйте её.' },
];

export default function HomePage() {
  const effects = getEffects();
  const categories = getFxCategories();
  const hero = getEffect(HERO_FX);

  return (
    <>
      <section className="fxh" aria-labelledby="fxhTitle">
        <div className="hero-grid fxh-grid" aria-hidden="true" />
        <div className="wrap fxh-in">
          <div className="fxh-copy">
            <Reveal as="p" className="eyebrow fxh-eyebrow">Эффекты и анимации для Tilda</Reveal>
            <Heading as="h1" id="fxhTitle" className="h2 fxh-title" manual delay={0.1} text="Крутите ползунки —|сайт *оживает*" />
            <Reveal as="p" className="lede">Готовые визуальные эффекты и анимации для сайтов, в том числе на Tilda. Выберите эффект, настройте параметры и сразу посмотрите результат в живом превью.</Reveal>
            <Reveal className="cta fxh-cta">
              <a className="btn btn-primary" href="#catalog">Смотреть каталог <IconArrow /></a>
              <a className="btn btn-ghost" href="#how">Как это работает</a>
            </Reveal>
          </div>

          <Reveal className="fx-stage fxh-stage" delay={0.2}>
            <div className="fx-stage-bar">
              <span className="fx-stage-meta">AW-Flow — {hero.name} · .{defaultClass(hero)}</span>
              <Link className="fx-replay" href={`/effects/${hero.slug}`}>Настроить <IconArrow /></Link>
            </div>
            <div className="fx-stage-view">
              <FxFrame fx={hero} values={fxDefaults(hero)} mode="card" href={`/effects/${hero.slug}`} zoom={0.86} defer={900} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-tight fx-catalog" id="catalog">
        <div className="wrap">
          <div className="s-head">
            <Heading className="h2" text="Каталог *эффектов*" />
            <Reveal as="p" className="s-side">В каждой карточке — настоящий код эффекта в работе. Наведите, чтобы проиграть его заново, или откройте конструктор.</Reveal>
          </div>
          <AwFlowCatalog effects={effects} categories={categories} />
        </div>
      </section>

      <section className="section-tight fx-how" id="how">
        <div className="wrap">
          <div className="s-head">
            <Heading className="h2" text="Как это *работает*" />
            <Reveal as="p" className="s-side">Четыре шага от выбора до эффекта на опубликованном сайте. Программировать ничего не нужно.</Reveal>
          </div>
          <Reveal stagger className="proc-row fx-steps">
            {STEPS.map((s, i) => (
              <div className="proc-step" key={s.t}>
                <span className="proc-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <div className="wrap">
        <CtaBand title="Нужен эффект, которого нет в *каталоге*?" text="Опишите идею — студия alexwebstudio соберёт анимацию под ваш сайт на Tilda или на коде." message={CUSTOM_TEXT} />
      </div>
    </>
  );
}
