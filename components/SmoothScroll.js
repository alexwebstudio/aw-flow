'use client';
/* Lenis + ScrollTrigger, полоса прогресса, параллакс свечения,
   плавные переходы по якорям и сброс скролла при смене страницы. */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { getLenis, prefersReduced, scrollToTarget, setLenis } from '@/lib/client';

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let lenis = null, tick = null;
    if (!prefersReduced()) {
      lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      setLenis(lenis);
      lenis.on('scroll', ScrollTrigger.update);
      tick = t => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    const ctx = gsap.context(() => {
      gsap.to('.prog', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true } });
      /* параллакс фонового свечения — только на десктопе: на мобильных это лишний слой на каждый кадр скролла */
      if (!prefersReduced() && window.matchMedia('(min-width: 761px)').matches) gsap.to('.glow-bg', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true } });
    });

    /* якоря на текущей странице — плавно, с учётом высоты шапки */
    const onClick = e => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const a = e.target.closest('a[href*="#"]');
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      scrollToTarget(el);
      history.replaceState(history.state, '', url.hash);
    };
    document.addEventListener('click', onClick);

    /* страховка: «нативные» прокрутки без Lenis (полоса прокрутки, End, поиск по странице).
       При активном Lenis триггеры и так обновляются из lenis.on('scroll') — второй раз не считаем */
    const update = () => { if (!lenis) ScrollTrigger.update(); };
    window.addEventListener('scroll', update, { passive: true });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('load', refresh);
      window.removeEventListener('scroll', update);
      ctx.revert();
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  /* смена страницы: наверх или к якорю, пересчёт триггеров */
  useEffect(() => {
    const hash = location.hash;
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      if (hash.length > 1) {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) scrollToTarget(el);
      }
    }, 120);
    if (hash.length < 2) getLenis()?.scrollTo(0, { immediate: true, force: true });
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
