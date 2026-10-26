'use client';
/* Шапка AW-Flow: логотип, короткая навигация по витрине, CTA и полноэкранное
   меню (та же механика, что на сайте студии): пункты по центру, внизу соцсети. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import settings from '@/content/settings.json';
import { lockScroll, prefersReduced, scrollToTarget, unlockScroll } from '@/lib/client';
import { IconArrowUp, socialList } from './Icons';
import { getEffect } from '@/lib/aw-flow';
import { effectOrderText, ORDER_TEXT } from '@/lib/contact';
import OrderLink from './OrderLink';

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/#catalog', label: 'Каталог эффектов' },
  { href: '/#how', label: 'Как это работает' },
  { href: settings.studio.url, label: 'Студия alexwebstudio', external: true },
];
const INLINE = NAV.slice(1, 3);

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menu = useRef(null);
  const btn = useRef(null);
  const tl = useRef(null);

  const isCurrent = href => (href === '/' ? pathname === '/' : !href.includes('#') && pathname.startsWith(href));

  /* фон при скролле, скрытие при прокрутке вниз */
  useEffect(() => {
    /* не чаще одного раза за кадр */
    let last = window.scrollY, raf = 0;
    const check = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y < 400 || y < last - 4) setHidden(false);
      else if (y > last + 4) setHidden(true);
      last = y;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
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

  /* якорь на главной из открытого меню: сначала закрываем меню (оно блокирует скролл), потом едем к блоку */
  const onMenuLink = (e, href) => {
    const hash = href.split('#')[1];
    if (!hash || pathname !== '/') { setOpen(false); return; }
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) scrollToTarget(el);
      history.replaceState(history.state, '', `#${hash}`);
    }, prefersReduced() ? 0 : 500);
  };

  const socials = socialList(settings.contacts);
  /* «Заказать эффект» открывает Telegram с готовым сообщением; на странице эффекта — с его названием */
  const fx = pathname.startsWith('/effects/') ? getEffect(pathname.split('/')[2]) : null;
  const orderText = fx ? effectOrderText(fx.name) : ORDER_TEXT;

  return (
    <>
      <a className="skip" href="#main">Перейти к содержимому</a>
      <header className={`topbar${scrolled ? ' is-scrolled' : ''}${hidden && !open ? ' is-hidden' : ''}`}>
        <div className="wrap topbar-in">
          <Link className="logo" href="/" aria-label="AW-Flow — на главную" onClick={() => setOpen(false)}>AW-<b>Flow</b></Link>
          <nav className="nav-inline" aria-label="Разделы витрины">
            {INLINE.map(n => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </nav>
          <div className="nav-r">
            <OrderLink className="btn btn-primary nav-cta" text={orderText}>Заказать эффект</OrderLink>
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
              {n.external ? (
                <a className="m-link" href={n.href} target="_blank" rel="noopener noreferrer"><span>{n.label} <IconArrowUp className="m-ext" /></span></a>
              ) : (
                <Link className="m-link" href={n.href} aria-current={isCurrent(n.href) ? 'page' : undefined} onClick={e => onMenuLink(e, n.href)}>
                  <span>{n.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
        <OrderLink className="btn btn-primary menu-order" text={orderText}>Заказать эффект</OrderLink>
        <div className="menu-soc">
          {socials.map(({ key, url, label, Icon }) => (
            <a key={key} className="soc-ic" href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon /></a>
          ))}
        </div>
      </nav>
    </>
  );
}
