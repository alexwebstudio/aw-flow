'use client';
/* 3D-наклон карточек за курсором — механика из портфолио первой версии сайта:
   rotateX/rotateY по положению мыши + лёгкое увеличение, сброс при уходе.
   Контейнеру карточек нужен perspective (задаётся в globals.css).
   selector — какие карточки анимировать (.svc — услуги, .prod — продукты). */
import { useEffect } from 'react';
import gsap from 'gsap';
import { prefersReduced } from '@/lib/client';

const TILT = 10;    // максимальный угол наклона, град.
const SCALE = 1.03; // «немного больше» при наведении

export default function CardTilt({ selector = '.svc' }) {
  useEffect(() => {
    if (prefersReduced()) return;
    if (window.matchMedia('(hover: none)').matches) return; // тач-устройства — без эффекта

    const cards = Array.from(document.querySelectorAll(selector));
    const detach = cards.map(card => {
      const enter = () => gsap.to(card, { scale: SCALE, duration: 0.4, ease: 'power3', overwrite: 'auto' });
      const move = e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -TILT;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * TILT;
        gsap.to(card, { rotateX: rx, rotateY: ry, duration: 0.4, ease: 'power3' });
      };
      const leave = () => gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.6, ease: 'power3', overwrite: 'auto' });

      card.addEventListener('mouseenter', enter);
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      return () => {
        card.removeEventListener('mouseenter', enter);
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
        gsap.killTweensOf(card);
        gsap.set(card, { clearProps: 'transform' });
      };
    });

    return () => detach.forEach(fn => fn());
  }, [selector]);

  return null;
}
