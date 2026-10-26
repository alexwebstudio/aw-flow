'use client';
/* Появление блока при прокрутке. stagger — дочерние элементы
   появляются по очереди с небольшим интервалом. */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReduced } from '@/lib/client';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export default function Reveal({ as: Tag = 'div', stagger = false, delay = 0, y = 24, className, children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (prefersReduced()) { el.classList.add('rv-in'); return; }
    const ctx = gsap.context(() => {
      if (stagger) {
        const items = [...el.children];
        gsap.set(items, { y: 36, opacity: 0 });
        el.classList.add('rv-in');
        ScrollTrigger.batch(items, {
          start: 'top 94%', once: true,
          onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.07, overwrite: true }),
        });
      } else {
        // только transform и opacity: blur при появлении блоков слишком дорог
        const from = { y, opacity: 0, force3D: true };
        const to = { y: 0, opacity: 1, force3D: true };
        gsap.set(el, from);
        el.classList.add('rv-in');
        gsap.to(el, { ...to, duration: 0.9, delay, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      }
    }, el);
    return () => { ctx.revert(); el.classList.remove('rv-in'); };
  }, [stagger, delay, y]);

  return <Tag ref={ref} data-reveal="" className={className} {...rest}>{children}</Tag>;
}
