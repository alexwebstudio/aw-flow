'use client';
/* Подвал — композиция и стиль прошлой версии сайта без изменений.
   Обновлён только нижний ряд: иконки соцсетей и ссылка на Telegram-канал. */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import settings from '@/content/settings.json';
import { prefersReduced, scrollToTarget } from '@/lib/client';
import { socialList } from './Icons';

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
      <Link className="f-word" href="/" onClick={toTop} aria-label="alexwebstudio">alexwebstudio<i>.</i></Link>
      <div className="f-mid">
        <p className="f-desc">Веб-студия полного цикла. Создаю современные сайты для бизнеса в России и Казахстане — от идеи до результата, который приносит заявки.</p>
        <nav className="f-nav" aria-label="Разделы сайта">
          <Link href="/portfolio">Портфолио</Link>
          <Link href="/#useful">Полезные работы</Link>
          <Link href="/services">Услуги</Link>
          <Link href="/about#process">Этапы</Link>
          <Link href="/about#principles">Принципы</Link>
          <Link href="/about#advantages">Преимущества</Link>
          <Link href="/reviews">Отзывы</Link>
          <Link href="/about">Обо мне</Link>
          <Link href="/brief">Контакты</Link>
        </nav>
      </div>
      <div className="f-bottom">
        <div className="f-legal">
          <span>© 2026 alexwebstudio — Все права защищены</span>
          <Link href="/privacy">Политика конфиденциальности</Link>
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
