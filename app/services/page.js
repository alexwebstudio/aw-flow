import Link from 'next/link';
import Heading from '@/components/Heading';
import Reveal from '@/components/Reveal';
import CtaBand from '@/components/CtaBand';
import CardTilt from '@/components/CardTilt';
import { IconArrow } from '@/components/Icons';
import { getServices, getSettings } from '@/lib/content';
import { priceFrom } from '@/lib/price';
import { breadcrumbsLd, jsonLdScript, og } from '@/lib/seo';

export const metadata = {
  title: 'Услуги — создание и доработка сайтов',
  description: 'Все услуги alexwebstudio: лендинг, многостраничный и корпоративный сайт, интернет-магазин, сайт-визитка, пригласительное, SaaS-проект, доработка сайта и базовое SEO. На коде или Tilda, для бизнеса в России и Казахстане.',
  alternates: { canonical: '/services' },
  openGraph: og('/services'),
  robots: { index: true, follow: true },
};

/* Группы направлений для логичной иерархии H2 на странице. */
const GROUPS = [
  { id: 'site', title: 'Сайты под *задачу*', note: 'От одного экрана до корпоративного сайта — под цель вашего бизнеса.' },
  { id: 'product', title: 'Сложные *продукты*', note: 'Когда нужен не просто сайт, а работающий онлайн-сервис.' },
  { id: 'support', title: 'Доработка и *продвижение*', note: 'Улучшение готового сайта и техническая подготовка к поиску.' },
];

function ServiceCard({ s, n }) {
  const pf = priceFrom(s);
  return (
    <Link className="svc" href={`/services/${s.slug}`}>
      <span className="svc-num" aria-hidden="true">{String(n).padStart(2, '0')}</span>
      <span className="svc-title">{s.title}</span>
      <span className="svc-fit">{s.lead}</span>
      <span className="svc-foot">
        <span className="svc-price">{pf.rub}<span>{pf.kzt} · {s.term}</span></span>
        <span className="svc-more" aria-hidden="true"><IconArrow /></span>
      </span>
    </Link>
  );
}

export default function ServicesPage() {
  const services = getServices();
  const { siteUrl } = getSettings();

  const crumbsLd = breadcrumbsLd([
    { name: 'Главная', path: '/' },
    { name: 'Услуги', path: '/services' },
  ]);

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Услуги alexwebstudio',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.title,
      url: `${siteUrl}/services/${s.slug}`,
    })),
  };

  let n = 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(crumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(itemListLd)} />
      <CardTilt />

      <section className="page-hero has-wm">
        <span className="wm" aria-hidden="true">Услуги</span>
        <div className="wrap">
          <Heading as="h1" className="h-hero" manual text="Услуги: сайты *под задачу бизнеса*" />
          <Reveal as="p" className="lede">Делаю сайты на коде и на Tilda для бизнеса в России и Казахстане — от одностраничного лендинга до корпоративного сайта и интернет-магазина. Отдельно беру доработку готового сайта, базовую SEO-подготовку и разработку SaaS-проектов. Выберите направление — внутри подробно, что входит и сроки.</Reveal>
          <Reveal className="svc-hero-cta">
            <Link className="btn btn-primary" href="/brief">Подобрать в квизе <IconArrow /></Link>
            <Link className="link-u" href="/portfolio">Смотреть портфолио</Link>
          </Reveal>
        </div>
      </section>

      {GROUPS.map(g => {
        const list = services.filter(s => s.group === g.id);
        if (!list.length) return null;
        return (
          <section className="section" key={g.id} style={{ paddingTop: 0 }} aria-labelledby={`svc-${g.id}`}>
            <div className="wrap">
              <div className="s-head">
                <div><Heading id={`svc-${g.id}`} className="h2" text={g.title} /></div>
                <Reveal className="s-side"><p>{g.note}</p></Reveal>
              </div>
              <Reveal stagger className="svc-grid">
                {list.map(s => <ServiceCard key={s.id} s={s} n={++n} />)}
              </Reveal>
            </div>
          </section>
        );
      })}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal as="p" className="svc-price-note">Цены на странице — примерные: итоговая стоимость зависит от объёма и сложности задачи. Точную цену и сроки называю после того, как обсудим проект.</Reveal>
        </div>
      </section>

      <div className="wrap">
        <CtaBand title="Не уверены, что *подойдёт*?" text="Ответьте на несколько вопросов в квизе — предложу подходящий формат, сроки и следующий шаг." />
      </div>
    </>
  );
}
