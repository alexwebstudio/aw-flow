'use client';
/* Подвал AW-Flow — композиция подвала студии: крупное слово, описание,
   навигация и нижний ряд с соцсетями и ссылкой на студию. */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import settings from '@/content/settings.json';
import { getEffects } from '@/lib/aw-flow';
import { prefersReduced, scrollToTarget } from '@/lib/client';
import { socialList } from './Icons';

const LINKS = getEffects().slice(0, 4);

export default function Footer() {
  const ref = useRef(null);
  const pathname = usePathname();
  const socials = socialList(settings.contacts, ['telegram', 'whatsapp', 'instagram', 'tiktok', 'telegramChannel']);

  useEffect(() => {
    if (prefersReduced()) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from('.f-desc,.f-nav a,.f-bottom>div', { y: 24, opacity: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } });
    }, ref);
    return () => ctx.revert();
  }, [pathname]);

  const toTop = e => { if (pathname === '/') { e.preventDefault(); scrollToTarget(0); } };

  return (
    <footer ref={ref} className="site-footer">
      <Link className="f-word" href="/" onClick={toTop} aria-label="AW-Flow — на главную">AW-Flow<i>.</i></Link>
      <div className="f-mid">
        <p className="f-desc">Библиотека готовых эффектов и анимаций для сайтов на Tilda и на коде. Выберите эффект, настройте параметры и добавьте его на свой сайт.</p>
        <nav className="f-nav" aria-label="Разделы сайта">
          <Link href="/#catalog">Каталог</Link>
          <Link href="/#how">Как это работает</Link>
          {LINKS.map(fx => <Link key={fx.slug} href={`/effects/${fx.slug}`}>{fx.name}</Link>)}
        </nav>
      </div>
      <div className="f-bottom">
        <div className="f-legal">
          <span>© 2026 AW-Flow</span>
          <a href={settings.studio.url} target="_blank" rel="noopener noreferrer">Продукт студии {settings.studio.name}</a>
        </div>
        <div className="f-soc">
          {socials.map(({ key, url, label, Icon }) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon /></a>
          ))}
        </div>
      </div>
    </footer>
  );
}
