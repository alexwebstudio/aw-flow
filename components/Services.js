/* «Какой сайт нужен вам?» — компактные карточки-ссылки на страницы услуг. */
import Link from 'next/link';
import services from '@/content/services.json';
import Reveal from './Reveal';
import CardTilt from './CardTilt';
import { IconArrow } from './Icons';
import { priceFrom } from '@/lib/price';

/* На главной — только наиболее востребованные услуги (home: true).
   Полный список всех направлений — на отдельной странице /services. */
export default function Services() {
  const featured = services.filter(s => s.home);
  return (
    <>
    <CardTilt />
    <Reveal stagger className="svc-grid">
      {featured.map((s, i) => {
        const pf = priceFrom(s);
        return (
        <Link key={s.id} className="svc" href={`/services/${s.slug}`}>
          <span className="svc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <span className="svc-title">{s.title}</span>
          <span className="svc-fit">{s.lead}</span>
          <span className="svc-foot">
            <span className="svc-price">{pf.rub}<span>{pf.kzt} · {s.term}</span></span>
            <span className="svc-more" aria-hidden="true"><IconArrow /></span>
          </span>
        </Link>
        );
      })}
      <Link className="svc svc-help" href="/brief">
        <span className="svc-num" aria-hidden="true">?</span>
        <span className="svc-title">Не знаете, что выбрать?</span>
        <span className="svc-fit">Ответьте на несколько вопросов — по ответам подскажу подходящий формат.</span>
        <span className="svc-foot">
          <span className="svc-price">Пройти квиз</span>
          <span className="svc-more" aria-hidden="true"><IconArrow /></span>
        </span>
      </Link>
    </Reveal>
    </>
  );
}
