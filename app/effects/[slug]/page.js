import Link from 'next/link';
import { notFound } from 'next/navigation';
import Heading from '@/components/Heading';
import Reveal from '@/components/Reveal';
import FxStudio from '@/components/FxStudio';
import { IconArrow } from '@/components/Icons';
import { fxIndex, fxTag, fxTrigger, getEffect, getEffects, hasMobile, triggerLabel } from '@/lib/aw-flow';
import { breadcrumbsLd, jsonLdScript, og } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return getEffects().map(fx => ({ slug: fx.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const fx = getEffect(slug);
  if (!fx) return {};
  return {
    title: { absolute: `AW-Flow — ${fx.name}` },
    description: fx.short.slice(0, 180),
    alternates: { canonical: `/effects/${fx.slug}` },
    openGraph: og(`/effects/${fx.slug}`),
  };
}

export default async function EffectPage({ params }) {
  const { slug } = await params;
  const fx = getEffect(slug);
  if (!fx) notFound();
  const all = getEffects();
  const i = all.findIndex(x => x.slug === fx.slug);
  const prev = all[(i - 1 + all.length) % all.length];
  const next = all[(i + 1) % all.length];
  const others = all.filter(x => x.slug !== fx.slug && x.category === fx.category);
  const crumbsLd = breadcrumbsLd([
    { name: 'AW-Flow', path: '/' },
    { name: 'Каталог эффектов', path: '/#catalog' },
    { name: fx.name, path: `/effects/${fx.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(crumbsLd)} />
      <section className="svc-hero fx-hero">
        <div className="wrap">
          <Reveal as="nav" className="crumbs" aria-label="Навигация">
            <Link href="/">AW-Flow</Link><span>/</span><Link href="/#catalog">Каталог</Link><span>/</span><span aria-current="page">{fx.name}</span>
          </Reveal>
          <div className="svc-hero-grid">
            <div>
              <Reveal as="p" className="fx-hero-tags">
                <span className="fx-tag">{fxTag(fx)}</span>
                <span className="fx-num">fx/{fxIndex(fx.slug)}</span>
              </Reveal>
              <Heading as="h1" className="h2 fx-hero-title" manual text={`AW-Flow — *${fx.name}*`} />
              <Reveal as="p" className="lede">{fx.short}</Reveal>
            </div>
            <Reveal as="dl" className="svc-facts fx-facts">
              <div><dt>Запуск</dt><dd>{triggerLabel(fxTrigger(fx))}</dd></div>
              <div><dt>Параметров</dt><dd>{fx.params.length}</dd></div>
              <div><dt>Телефоны</dt><dd>{hasMobile(fx) ? 'свои настройки' : fx.sub === 'hover' ? 'без ховера' : 'как на десктопе'}</dd></div>
              <div><dt>Код</dt><dd>{fx.scope === 'site' ? 'на весь сайт' : 'HTML-блок'}</dd></div>
            </Reveal>
          </div>
        </div>
      </section>

      <FxStudio fx={fx} />

      <div className="wrap">
        <nav className="pj-nav fx-pn" aria-label="Соседние эффекты">
          <Link href={`/effects/${prev.slug}`}><small>← Предыдущий</small><strong>{prev.name}</strong></Link>
          <Link href={`/effects/${next.slug}`}><small>Следующий →</small><strong>{next.name}</strong></Link>
        </nav>
        {others.length > 0 && (
          <>
            <div className="fx-more-head">
              <span className="label">Ещё в разделе «{fxTag(fx).split(' · ')[0]}»</span>
              <Link className="link-u" href="/#catalog">Весь каталог <IconArrow /></Link>
            </div>
            <nav className="svc-more-nav fx-more-nav" aria-label="Другие эффекты раздела">
              {others.map(o => <Link key={o.slug} href={`/effects/${o.slug}`}><span>{o.name}</span><IconArrow /></Link>)}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
