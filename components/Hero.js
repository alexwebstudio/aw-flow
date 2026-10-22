'use client';
/* Hero: сайт как инструмент бизнеса. Без фоновых квадратиков, без точки
   и без «листайте вниз». Заголовок проявляется из размытия, подзаголовок
   и кнопки — мягко вслед за ним. */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Heading from './Heading';
import { IconArrow } from './Icons';
import { onReady, prefersReduced } from '@/lib/client';

export default function Hero() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    const fades = el.querySelectorAll('[data-hf]');
    if (prefersReduced()) { fades.forEach(f => f.classList.add('rv-in')); return; }
    const ctx = gsap.context(() => {
      gsap.set(fades, { y: 24, opacity: 0 });
      fades.forEach(f => f.classList.add('rv-in'));
    }, el);
    onReady(() => ctx.add(() => {
      gsap.to(fades, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.35 });
    }));
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="hero" id="hero" aria-labelledby="heroTitle">
      <div className="hero-glow" aria-hidden="true" />
      <div className="wrap hero-inner">
        <p className="eyebrow" data-hf>Веб-студия · Караганда, Казахстан</p>
        <Heading as="h1" id="heroTitle" className="h-hero" manual delay={0.1}
          text="Разработка сайтов,|которые *приводят клиентов*" />
        <p className="lede" data-hf>Разрабатываю сайты для бизнеса в Казахстане и России — не просто красивые, а работающие на результат: они объясняют ценность, вызывают доверие и превращают посетителей в заявки.</p>
        <div className="cta" data-hf>
          <a className="btn btn-primary" href="#work">Смотреть работы</a>
          <Link className="btn btn-ghost" href="/brief">Обсудить проект <IconArrow /></Link>
        </div>
      </div>
    </section>
  );
}
