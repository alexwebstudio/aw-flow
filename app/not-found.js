import Link from 'next/link';
import Heading from '@/components/Heading';
import BackLink from '@/components/BackLink';
import { IconArrow } from '@/components/Icons';
import { getEffects } from '@/lib/aw-flow';

export const metadata = { title: 'Страница не найдена' };

export default function NotFound() {
  const links = getEffects().slice(0, 4);
  return (
    <section className="nf has-wm">
      <span className="wm" aria-hidden="true">404</span>
      <div className="wrap nf-in">
        <p className="pj-kicker">Ошибка 404</p>
        <Heading as="h1" className="h-hero" text="Такого эффекта *нет*" />
        <p className="lede">Возможно, ссылка устарела или в адресе опечатка. Вернитесь в каталог или откройте один из эффектов.</p>
        <div className="cta">
          <Link className="btn btn-primary" href="/#catalog">В каталог <IconArrow /></Link>
          <BackLink>Назад</BackLink>
        </div>
        <nav className="nf-links" aria-label="Эффекты">
          {links.map(fx => <Link key={fx.slug} href={`/effects/${fx.slug}`}>{fx.name}</Link>)}
        </nav>
      </div>
    </section>
  );
}
