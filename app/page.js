import Link from 'next/link';
import Preloader from '@/components/Preloader';
import Hero from '@/components/Hero';
import Heading from '@/components/Heading';
import Reveal from '@/components/Reveal';
import Showcase from '@/components/Showcase';
import Useful from '@/components/Useful';
import Services from '@/components/Services';
import Faq from '@/components/Faq';
import { IconArrow } from '@/components/Icons';
import { getProjects, getSettings, toCard } from '@/lib/content';
import { og } from '@/lib/seo';

export const metadata = { alternates: { canonical: '/' }, openGraph: og('/') };

export default function HomePage() {
  const projects = getProjects();
  const featured = projects.filter(p => p.featured).map(toCard);
  const { siteUrl, contacts } = getSettings();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'AlexWebStudio',
    description: 'Веб-студия: разработка сайтов под ключ — лендинги, интернет-магазины, корпоративные сайты и пригласительные для бизнеса в России и Казахстане.',
    url: siteUrl + '/',
    image: siteUrl + '/images/preview.jpg',
    priceRange: '$$',
    areaServed: [{ '@type': 'Country', name: 'Kazakhstan' }, { '@type': 'Country', name: 'Russia' }],
    address: { '@type': 'PostalAddress', addressLocality: 'Караганда', addressCountry: 'KZ' },
    founder: { '@type': 'Person', name: 'Александр' },
    sameAs: [contacts.telegram, contacts.whatsapp, contacts.instagram, contacts.tiktok].filter(Boolean),
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', url: contacts.telegram },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Preloader />
      <Hero />

      {/* ПОРТФОЛИО */}
      <section className="section has-wm" id="work" aria-labelledby="workTitle">
        <span className="wm" aria-hidden="true">Работы</span>
        <div className="wrap">
          <div className="s-head">
            <div>
              <Heading id="workTitle" className="h2" text="Избранные *работы*" />
            </div>
            <Reveal className="s-side">
              <p>Реальные проекты для заказчиков и концепты, в которых я показываю подход к разным нишам. Выберите работу — она откроется в крупной карточке.</p>
              <Link className="link-u" href="/portfolio">Всё портфолио <IconArrow /></Link>
            </Reveal>
          </div>
          <Showcase projects={featured} />
        </div>
      </section>

      {/* ПОЛЕЗНЫЕ РАБОТЫ */}
      <section className="section has-wm" id="useful" aria-labelledby="usefulTitle">
        <span className="wm" aria-hidden="true">Продукты</span>
        <div className="wrap">
          <div className="s-head">
            <div>
              <Heading id="usefulTitle" className="h2" text="Мои полезные *работы*" />
            </div>
            <Reveal className="s-side"><p>Инструменты, которые я сделал, чтобы задачу можно было решить самому — без заказа отдельного сайта.</p></Reveal>
          </div>
          <Useful />
        </div>
      </section>

      {/* КАКОЙ САЙТ НУЖЕН */}
      <section className="section has-wm" id="types" aria-labelledby="typesTitle">
        <span className="wm" aria-hidden="true">Услуги</span>
        <div className="wrap">
          <div className="s-head">
            <div>
              <Heading id="typesTitle" className="h2" text="Какой сайт *нужен* вам?" />
            </div>
            <Reveal className="s-side">
              <p>Выберите формат под задачу: в карточке — что входит и сроки. Если сомневаетесь, квиз поможет определиться.</p>
              <Link className="link-u" href="/services">Все услуги <IconArrow /></Link>
            </Reveal>
          </div>
          <Services />
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq" aria-labelledby="faqTitle">
        <div className="wrap faq-wrap">
          <div className="faq-aside">
            <Heading id="faqTitle" className="h2" text="Частые *вопросы*" />
            <Reveal as="p">Не нашли ответа — оставьте заявку в квизе или напишите в Telegram.</Reveal>
            <Reveal><Link className="btn btn-primary" href="/brief">Обсудить проект <IconArrow /></Link></Reveal>
          </div>
          <Faq />
        </div>
      </section>
    </>
  );
}
