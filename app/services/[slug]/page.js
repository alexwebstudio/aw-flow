import Link from 'next/link';
import { notFound } from 'next/navigation';
import Heading from '@/components/Heading';
import Reveal from '@/components/Reveal';
import CtaBand from '@/components/CtaBand';
import WorkCard, { projectSub } from '@/components/WorkCard';
import CardTilt from '@/components/CardTilt';
import { IconArrow } from '@/components/Icons';
import about from '@/content/about.json';
import { getService, getServices, getProduct, getProjectsByKinds, toCard, getSettings } from '@/lib/content';
import { breadcrumbsLd, jsonLdScript, og } from '@/lib/seo';
import { priceRows } from '@/lib/price';

export const dynamicParams = false;

export function generateStaticParams() {
  return getServices().map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return {
    title: s.title,
    description: s.desc.slice(0, 180),
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: og(`/services/${s.slug}`),
  };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();
  const related = getProjectsByKinds(s.kinds).slice(0, 3).map(toCard);
  const others = getServices().filter(x => x.slug !== s.slug);
  const product = s.product ? getProduct(s.product) : null;
  const { siteUrl } = getSettings();

  const crumbsLd = breadcrumbsLd([
    { name: 'Главная', path: '/' },
    { name: 'Услуги', path: '/services' },
    { name: s.title, path: `/services/${s.slug}` },
  ]);

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.title,
    serviceType: s.title,
    description: s.desc,
    url: `${siteUrl}/services/${s.slug}`,
    provider: { '@type': 'ProfessionalService', name: 'AlexWebStudio', url: siteUrl + '/' },
    areaServed: [{ '@type': 'Country', name: 'Kazakhstan' }, { '@type': 'Country', name: 'Russia' }],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(crumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(serviceLd)} />
      <section className="svc-hero">
        <div className="wrap">
          <Reveal as="nav" className="crumbs" aria-label="Навигация">
            <Link href="/">Главная</Link><span>/</span><Link href="/services">Услуги</Link><span>/</span><span aria-current="page">{s.title}</span>
          </Reveal>
          <div className="svc-hero-grid">
            <div>
              <Heading as="h1" className="h-hero" manual text={s.title} />
              <Reveal as="p" className="lede">{s.desc}</Reveal>
              <Reveal className="svc-hero-cta">
                <Link className="btn btn-primary" href={`/brief?type=${encodeURIComponent(s.quizType)}`}>Обсудить проект <IconArrow /></Link>
                <Link className="link-u" href="/services">Все услуги</Link>
              </Reveal>
            </div>
            <div>
              <Reveal as="dl" className="svc-facts">
                {priceRows(s).map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
                <div><dt>Срок</dt><dd>{s.term}</dd></div>
              </Reveal>
              {s.price && <Reveal as="p" className="svc-price-note">Цены примерные — точную стоимость называю после обсуждения задачи.</Reveal>}
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap svc-cols">
          <Reveal as="section" className="svc-col">
            <h2 className="h3">Какие задачи решает</h2>
            <p>{s.lead}</p>
            <h2 className="h3" style={{ marginTop: 32 }}>Кому подходит</h2>
            <p>Подойдёт, если {s.fit}.</p>
          </Reveal>
          <Reveal as="section" className="svc-col">
            <h2 className="h3">Что входит</h2>
            <ul className="svc-inc">{s.inc.map(x => <li key={x}>{x}</li>)}</ul>
          </Reveal>
        </div>
      </section>

      <section className="section-tight band">
        <div className="wrap">
          <Heading className="h2" text="Как проходит *работа*" />
          <Reveal stagger className="proc-row">
            {about.process.map((p, i) => (
              <div className="proc-step" key={p.t}>
                <span className="proc-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {(related.length > 0 || product) && (
        <section className="section-tight">
          <div className="wrap">
            <div className="s-head">
              <Heading className="h2" text="Подходящие *работы*" />
              <Reveal className="s-side"><Link className="link-u" href="/portfolio">Всё портфолио <IconArrow /></Link></Reveal>
            </div>
            {product && <CardTilt selector=".prod" />}
            {product && (
              <Reveal className="prod-grid" style={{ marginBottom: related.length > 0 ? 'clamp(20px,3vw,32px)' : 0 }}>
                <Link href={`/products/${product.slug}`} className="prod">
                  <div className="prod-top">
                    <span className="prod-tag">{product.tag}</span>
                    {product.stats?.[0] && <span className="prod-stat" dangerouslySetInnerHTML={{ __html: product.stats[0].val + ' · ' + product.stats[0].lab.toLowerCase() }} />}
                  </div>
                  <div className="prod-main">
                    <h3 className="prod-title">{product.short}</h3>
                    <p className="prod-desc">{product.purpose}</p>
                  </div>
                  {product.events?.length > 0 && (
                    <div className="prod-tags" aria-hidden="true">{product.events.slice(0, 5).map(e => <span key={e}>{e}</span>)}</div>
                  )}
                  <span className="prod-more">Подробнее <IconArrow /></span>
                </Link>
              </Reveal>
            )}
            {related.length > 0 && (
              <Reveal stagger className="works">
                {related.map(p => <WorkCard key={p.slug} p={p} sizes="(max-width: 900px) 100vw, 33vw" />)}
              </Reveal>
            )}
          </div>
        </section>
      )}

      <div className="wrap">
        <CtaBand title={`Обсудим ваш *${s.title.toLowerCase()}*?`} text="Расскажите о задаче в квизе — предложу решение, сроки и следующий шаг." />
        <nav className="svc-more-nav" aria-label="Другие услуги">
          {others.map(o => (
            <Link key={o.slug} href={`/services/${o.slug}`}><span>{o.title}</span><IconArrow /></Link>
          ))}
        </nav>
      </div>
    </>
  );
}
