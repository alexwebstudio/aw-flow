'use client';
/* Шапка и полноэкранное меню: пункты по центру, внизу — иконки соцсетей. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import settings from '@/content/settings.json';
import { lockScroll, prefersReduced, unlockScroll } from '@/lib/client';
import { socialList } from './Icons';

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/services', label: 'Услуги' },
  { href: '/portfolio', label: 'Портфолио' },
  { href: '/about', label: 'Обо мне' },
  { href: '/reviews', label: 'Отзывы' },
  { href: '/join', label: 'Вступить в команду' },
  { href: '/brief', label: 'Обсудить проект' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [clock, setClock] = useState({ ala: '', msk: '' });
  const menu = useRef(null);
  const btn = useRef(null);
  const tl = useRef(null);

  const isCurrent = href => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));

  /* часы Астаны и Москвы — только на клиенте, чтобы не было расхождения с сервером */
  useEffect(() => {
    const fmt = tz => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const tick = () => setClock({ ala: fmt('Asia/Almaty'), msk: fmt('Europe/Moscow') });
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  /* фон при скролле, скрытие при прокрутке вниз */
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y < 400 || y < last - 4) setHidden(false);
      else if (y > last + 4) setHidden(true);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  /* анимация меню */
  useEffect(() => {
    const r = prefersReduced();
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({ paused: true })
        .to(menu.current, { clipPath: 'inset(0 0 0% 0)', duration: r ? 0.01 : 0.75, ease: 'power4.inOut' })
        .fromTo('.m-link span', { y: 0, yPercent: 115 }, { y: 0, yPercent: 0, duration: r ? 0.01 : 0.7, stagger: 0.06, ease: 'power3.out' }, r ? 0 : '-=0.3')
        .from('.menu-soc a', { y: 16, opacity: 0, duration: r ? 0.01 : 0.45, stagger: 0.05, ease: 'power3.out' }, r ? 0 : '-=0.45');
    }, menu);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const m = menu.current;
    if (!tl.current) return;
    if (open) {
      m.classList.add('open');
      lockScroll();
      tl.current.timeScale(1).play();
      const t = setTimeout(() => m.querySelector('.m-link')?.focus({ preventScroll: true }), 300);
      const onKey = e => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'Tab') {
          const f = [btn.current, ...m.querySelectorAll('a')];
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      };
      document.addEventListener('keydown', onKey);
      return () => {
        clearTimeout(t);
        document.removeEventListener('keydown', onKey);
        unlockScroll();
        tl.current.timeScale(1.7).reverse();
        tl.current.eventCallback('onReverseComplete', () => m.classList.remove('open'));
      };
    }
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { document.body.classList.toggle('menu-open', open); }, [open]);

  const socials = socialList(settings.contacts);

  return (
    <>
      <a className="skip" href="#main">Перейти к содержимому</a>
      <header className={`topbar${scrolled ? ' is-scrolled' : ''}${hidden && !open ? ' is-hidden' : ''}`}>
        <div className="wrap topbar-in">
          <Link className="logo" href="/" aria-label="alexwebstudio — на главную" onClick={() => setOpen(false)}>alex<b>web</b>studio</Link>
          <div className="nav-r">
            <span className="clock" aria-hidden="true">
              <span className="clock-city"><i>АСТ</i>{clock.ala}</span>
              <span className="clock-city"><i>МСК</i>{clock.msk}</span>
            </span>
            {pathname !== '/brief' && <Link className="btn btn-primary nav-cta" href="/brief">Обсудить проект</Link>}
            <button ref={btn} type="button" className="menu-btn" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(o => !o)}>
              <span>{open ? 'Закрыть' : 'Меню'}</span>
              <span className="bars" aria-hidden="true"><i /><i /></span>
            </button>
          </div>
        </div>
      </header>
      <nav ref={menu} id="site-menu" className="menu" aria-label="Основное меню" data-lenis-prevent="" inert={!open}>
        <ul className="menu-links">
          {NAV.map(n => (
            <li key={n.href}>
              <Link className="m-link" href={n.href} aria-current={isCurrent(n.href) ? 'page' : undefined} onClick={() => setOpen(false)}>
                <span>{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="menu-soc">
          {socials.map(({ key, url, label, Icon }) => (
            <a key={key} className="soc-ic" href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon /></a>
          ))}
        </div>
      </nav>
    </>
  );
}

