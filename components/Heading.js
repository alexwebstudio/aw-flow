'use client';
/* Заголовок с мягким появлением: слова поднимаются и проявляются из прозрачности.
   Анимируются только transform и opacity — blur на десятках слов слишком дорог для GPU.
   text: «Какой сайт *нужен* вам?» — *…* выделяет акцент, | переносит строку.
   manual — появление по готовности страницы (после прелоадера), а не по скроллу.
   after — узел в конце последней строки (например, сменяющееся слово в hero). */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onReady, prefersReduced } from '@/lib/client';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

function renderLine(line, li) {
  const out = [];
  line.split(/(\*[^*]+\*)/).forEach((seg, si) => {
    if (!seg) return;
    const accent = seg.startsWith('*') && seg.endsWith('*');
    seg.replace(/\*/g, '').split(/(\s+)/).forEach((w, wi) => {
      if (!w) return;
      if (/^\s+$/.test(w)) { out.push(' '); return; }
      const key = `${li}-${si}-${wi}`;
      const word = <span className="hw" key={key}>{w}</span>;
      out.push(accent ? <em key={`e${key}`}>{word}</em> : word);
    });
  });
  return out;
}

export default function Heading({ as: Tag = 'h2', text, className = '', id, manual = false, delay = 0, after = null, label }) {
  const ref = useRef(null);
  const lines = text.split('|');
  const plain = label || text.replace(/\*/g, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    const el = ref.current;
    if (prefersReduced()) { el.classList.add('hx-in'); return; }
    const words = el.querySelectorAll('.hw');
    const from = { opacity: 0, y: 18, force3D: true };
    const to = { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05, delay, force3D: true };
    const ctx = gsap.context(() => {
      gsap.set(words, from);
      el.classList.add('hx-in');
      if (!manual) gsap.to(words, { ...to, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    }, el);
    if (manual) onReady(() => ctx.add(() => gsap.to(words, to)));
    return () => { ctx.revert(); el.classList.remove('hx-in'); };
  }, [manual, delay]);

  return (
    <Tag ref={ref} id={id} className={`hx ${className}`} data-anim="">
      <span className="sr-only">{plain}</span>
      <span aria-hidden="true">
        {lines.length > 1
          ? lines.map((l, i) => <span className="ln" key={i}>{renderLine(l, i)}{i === lines.length - 1 && after}</span>)
          : <>{renderLine(lines[0], 0)}{after}</>}
      </span>
    </Tag>
  );
}
