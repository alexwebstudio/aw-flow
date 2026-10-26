'use client';
/* 3D-наклон карточек за курсором: rotateX/rotateY по положению мыши + лёгкое
   увеличение, сброс при уходе. Контейнеру карточек нужен perspective.
   Плавность: размеры карточки читаются один раз при наведении (и при скролле/
   ресайзе), а не на каждом mousemove; вместо нового твина на каждое событие —
   gsap.quickTo, который просто переназначает цель уже идущей анимации.
   will-change включается только на время наведения. */
import { useEffect } from 'react';
import gsap from 'gsap';
import { prefersReduced } from '@/lib/client';

const TILT = 8;     // максимальный угол наклона, град. (±TILT/2 по каждой оси)
const SCALE = 1.02; // лёгкое увеличение при наведении

export default function CardTilt({ selector = '.svc' }) {
  useEffect(() => {
    if (prefersReduced()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // тач-устройства — без эффекта

    const cards = Array.from(document.querySelectorAll(selector));
    const detach = cards.map(card => {
      gsap.set(card, { transformPerspective: 1000, force3D: true });
      const o = { duration: 0.5, ease: 'power3.out', force3D: true };
      const rx = gsap.quickTo(card, 'rotationX', o);
      const ry = gsap.quickTo(card, 'rotationY', o);
      const sx = gsap.quickTo(card, 'scaleX', o);
      const sy = gsap.quickTo(card, 'scaleY', o);
      const sc = v => { sx(v); sy(v); };
      let rect = null;
      const measure = () => { rect = card.getBoundingClientRect(); };

      const enter = () => {
        card.style.willChange = 'transform';
        measure();
        window.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure, { passive: true });
        sc(SCALE);
      };
      const move = e => {
        if (!rect) measure();
        const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
        rx((y - 0.5) * -TILT);
        ry((x - 0.5) * TILT);
      };
      const leave = () => {
        window.removeEventListener('scroll', measure);
        window.removeEventListener('resize', measure);
        rect = null;
        rx(0); ry(0); sc(1);
        gsap.delayedCall(0.55, () => { if (!rect) card.style.willChange = ''; });
      };

      card.addEventListener('mouseenter', enter);
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      return () => {
        card.removeEventListener('mouseenter', enter);
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
        window.removeEventListener('scroll', measure);
        window.removeEventListener('resize', measure);
        gsap.killTweensOf(card);
        gsap.set(card, { clearProps: 'transform,willChange' });
      };
    });

    return () => detach.forEach(fn => fn());
  }, [selector]);

  return null;
}
