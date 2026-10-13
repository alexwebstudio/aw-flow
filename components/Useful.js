/* «Мои полезные работы» — расширенные карточки продуктов. Подробности
   открываются на отдельной странице продукта (не в попапе). */
import Link from 'next/link';
import products from '@/content/products.json';
import Reveal from './Reveal';
import CardTilt from './CardTilt';
import { IconArrow } from './Icons';

const ORDER = ['maruno', 'soon'];

export default function Useful() {
  return (
    <>
    <CardTilt selector=".prod" />
    <Reveal stagger className="prod-grid">
      {ORDER.map(key => {
        const p = products[key];
        const soon = key === 'soon';
        return (
          <Link key={key} href={`/products/${p.slug}`} className={`prod${soon ? ' prod-soon' : ''}`}>
            <div className="prod-top">
              <span className="prod-tag">{p.tag}</span>
              {p.stats?.[0] && <span className="prod-stat" dangerouslySetInnerHTML={{ __html: p.stats[0].val + ' · ' + p.stats[0].lab.toLowerCase() }} />}
            </div>
            <div className="prod-main">
              <h3 className="prod-title">{p.short}</h3>
              <p className="prod-desc">{p.purpose}</p>
            </div>
            {p.events?.length > 0 && (
              <div className="prod-tags" aria-hidden="true">{p.events.slice(0, 5).map(e => <span key={e}>{e}</span>)}</div>
            )}
            <span className="prod-more">Подробнее <IconArrow /></span>
          </Link>
        );
      })}
    </Reveal>
    </>
  );
}
