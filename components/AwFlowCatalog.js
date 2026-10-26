'use client';
/* AW-Flow: каталог эффектов — клиентский фильтр по категориям и подразделам
   (кнопки-пилюли .pf-cat с aria-pressed) и адаптивная сетка карточек 3 → 2 → 1. */
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FxCard from './FxCard';
import CardTilt from './CardTilt';
import { prefersReduced } from '@/lib/client';
import { subLabel } from '@/lib/aw-flow';

export default function AwFlowCatalog({ effects, categories }) {
  const [cat, setCat] = useState('all');
  const [sub, setSub] = useState('all');
  const grid = useRef(null);
  const firstRender = useRef(true);

  const cats = useMemo(() => [
    { id: 'all', label: 'Все', n: effects.length },
    ...categories.map(c => ({ ...c, n: effects.filter(fx => fx.category === c.id).length })).filter(c => c.n),
  ], [effects, categories]);

  const inCat = cat === 'all' ? effects : effects.filter(fx => fx.category === cat);
  const subs = useMemo(() => {
    const ids = [...new Set(inCat.map(fx => fx.sub).filter(Boolean))];
    return ids.length > 1 ? ids : [];
  }, [inCat]);
  const list = sub === 'all' ? inCat : inCat.filter(fx => fx.sub === sub);

  const pickCat = id => { setCat(id); setSub('all'); };

  /* появление карточек: при первом показе — по скроллу, при смене фильтра — сразу */
  useEffect(() => {
    if (prefersReduced()) return;
    const items = grid.current.querySelectorAll('.fx-card');
    const ctx = gsap.context(() => {
      if (firstRender.current) {
        firstRender.current = false;
        gsap.set(items, { y: 36, opacity: 0 });
        ScrollTrigger.batch(items, { start: 'top 94%', once: true,
          onEnter: b => gsap.to(b, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.07 }) });
      } else {
        gsap.fromTo(items, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05 });
      }
    }, grid);
    const t = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => { clearTimeout(t); ctx.revert(); };
  }, [cat, sub]);

  return (
    <>
      {/* наклон перевешивается на новый набор карточек после фильтрации */}
      <CardTilt key={`${cat}-${sub}`} selector=".fx-card" />
      <div className="pf-bar fx-bar">
        <div className="fx-filters">
          <div className="pf-filter" role="group" aria-label="Категория эффекта">
            {cats.map(c => (
              <button key={c.id} type="button" className="pf-cat" aria-pressed={cat === c.id} onClick={() => pickCat(c.id)}>
                {c.label}<span>{c.n}</span>
              </button>
            ))}
          </div>
          {subs.length > 0 && (
            <div className="fx-subs" role="group" aria-label="Подраздел">
              {['all', ...subs].map(s => (
                <button key={s} type="button" className="fx-sub" aria-pressed={sub === s} onClick={() => setSub(s)}>
                  {s === 'all' ? 'Все' : subLabel(s)}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="fx-bar-note" aria-live="polite">показано: {list.length} / {effects.length}</p>
      </div>
      <div ref={grid} className="fx-grid">
        {list.map(fx => <FxCard key={fx.slug} fx={fx} />)}
      </div>
    </>
  );
}
