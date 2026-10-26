'use client';
/* AW-Flow: живое превью эффекта. В iframe загружается демо-страница
   с ровно тем кодом, который выдаётся на копирование (buildCode) —
   поэтому «что в превью, то и в коде».
   — desktop: страница шириной ≥1040px, уменьшенная под размер сцены;
   — mobile: настоящий вьюпорт 390px, мобильные @media внутри кода срабатывают;
   — в карточках каталога эффект проигрывается сам (перезапуск, «призрачный» курсор,
     клики), а при наведении — заново; на reduced-motion автопроигрывание выключено,
     а сам код показывает статичный кадр. */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLenis } from '@/lib/client';
import { buildCode, classOf } from '@/lib/fx/code';
import { buildDemo } from '@/lib/fx/demo';

const DESKTOP_W = 1040;
const CARD_W = 760;   // в карточках — чуть «ближе», чтобы эффект читался
const PHONE_W = 390;
const PHONE_H = 780;
const LOOP_MS = 6500;

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (!ms) { setV(value); return; }
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* шрифты сайта для демо-страницы: @font-face из таблиц стилей и имена семейств */
let fontCache = null;
function siteFonts() {
  if (fontCache) return fontCache;
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const base = sheet.href || location.href;
      for (const r of Array.from(sheet.cssRules)) {
        if (r.type !== 5) continue;
        // относительные url() шрифтов → абсолютные, иначе в iframe они не найдутся
        css += r.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => (/^(data|blob|https?):/.test(u) ? m : `url("${new URL(u, base).href}")`)) + '\n';
      }
    } catch { /* сторонние таблицы недоступны — пропускаем */ }
  }
  const cs = getComputedStyle(document.documentElement);
  const pick = n => cs.getPropertyValue(n).trim();
  fontCache = { css, fh: pick('--font-heading'), fb: pick('--font-body'), fm: pick('--font-mono') };
  return fontCache;
}

/* автопроигрывание внутри iframe: события, которые запускают сам код эффекта */
function autoplay(kind, win, doc, C, real) {
  if (kind === 'pointer') {
    let raf = 0, t = Math.random() * 6, last = performance.now();
    const inside = new Set();
    const tick = now => {
      t += Math.min(64, now - last) / 1000;
      last = now;
      if (!real.current) {
        const x = win.innerWidth * (0.5 + 0.34 * Math.sin(t * 0.9));
        const y = win.innerHeight * (0.5 + 0.3 * Math.sin(t * 1.3 + 0.8));
        const target = doc.elementFromPoint(x, y) || doc.body;
        const init = { clientX: x, clientY: y, bubbles: true };
        target.dispatchEvent(new win.MouseEvent('mousemove', init));
        target.dispatchEvent(new win.PointerEvent('pointermove', init));
        doc.querySelectorAll('.' + C).forEach(el => {
          const now = el.contains(target);
          if (inside.has(el) && !now) el.dispatchEvent(new win.PointerEvent('pointerleave'));
          if (now) inside.add(el); else inside.delete(el);
        });
      }
      raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(raf);
  }
  if (kind === 'enter') {
    let i = 0;
    const fire = () => {
      if (real.current) return;
      const els = doc.querySelectorAll('.' + C);
      if (els.length) els[i++ % els.length].dispatchEvent(new win.MouseEvent('mouseenter'));
    };
    const first = win.setTimeout(fire, 600);
    const id = win.setInterval(fire, 2400);
    return () => { win.clearTimeout(first); win.clearInterval(id); };
  }
  if (kind === 'click') {
    const id = win.setTimeout(() => {
      if (!real.current) doc.querySelector('[data-awf-page]')?.click();
    }, 2600);
    return () => win.clearTimeout(id);
  }
  return () => {};
}

/* колесо над превью прокручивает страницу так же, как над пустым местом:
   событие из iframe гасим и передаём в Lenis (или в обычный скролл) */
function forwardWheel(win) {
  const onWheel = e => {
    if (e.ctrlKey) return; // масштаб страницы жестом — не трогаем
    e.preventDefault();
    if (getLenis()) {
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode, bubbles: true, cancelable: true,
      }));
    } else {
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy(e.deltaX * k, e.deltaY * k);
    }
  };
  win.addEventListener('wheel', onWheel, { passive: false });
  return () => win.removeEventListener('wheel', onWheel);
}

const idle = (fn, timeout) => {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 60);
  return () => clearTimeout(id);
};

export default function FxFrame({ fx, values, mode = 'card', device = 'desktop', replay = 0, href, label, defer = 0, zoom = 0 }) {
  const wrap = useRef(null);
  const frame = useRef(null);
  const real = useRef(false);
  const rectRef = useRef(null);
  const scaleRef = useRef(1);
  const lastReplay = useRef(0);
  const router = useRouter();
  const key = useId();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [near, setNear] = useState(false);      // рядом с экраном — iframe существует
  const [visible, setVisible] = useState(false); // видна заметная часть — эффект проигрывается
  const [reduced, setReduced] = useState(false);
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(0);

  const sig = JSON.stringify(values);
  const dsig = useDebounced(sig, mode === 'stage' ? 200 : 0);
  const v = useMemo(() => JSON.parse(dsig), [dsig]);
  const code = useMemo(() => buildCode(fx, v), [fx, v]);
  const C = classOf(fx, v);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* размер сцены и видимость */
  useEffect(() => {
    const el = wrap.current;
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '120px 0px' });
    const ioSee = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    ro.observe(el);
    ioNear.observe(el);
    ioSee.observe(el);
    return () => { ro.disconnect(); ioNear.disconnect(); ioSee.disconnect(); };
  }, []);

  /* документ превью — создаётся в свободное время браузера, а не посреди скролла */
  useEffect(() => {
    if (!near) { setSrc(null); return; }
    const urls = [];
    const make = html => {
      const u = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      urls.push(u);
      return u;
    };
    let cancelIdle = () => {};
    const build = () => {
      cancelIdle = idle(() => {
        const opts = { C, fonts: siteFonts(), origin: location.origin, pagesKey: key };
        if (fx.demo === 'pages') {
          const a = make(buildDemo(fx, code, { ...opts, page: 'a' }));
          const b = make(buildDemo(fx, code, { ...opts, page: 'b' }));
          window.__awfPages = { ...(window.__awfPages || {}), [key]: { a, b } };
          setSrc(a);
        } else {
          setSrc(make(buildDemo(fx, code, opts)));
        }
      }, 400);
    };
    const t = setTimeout(build, defer);
    return () => {
      clearTimeout(t);
      cancelIdle();
      setTimeout(() => urls.forEach(u => URL.revokeObjectURL(u)), 5000);
    };
  }, [near, code, fx, key, C, defer]);

  /* повтор — перезагрузка того же документа, без пересборки */
  const reload = () => {
    try { frame.current?.contentWindow?.location.reload(); } catch { /* документ ещё не готов */ }
  };
  useEffect(() => { if (replay) reload(); }, [replay]);

  /* лёгкий цикл в карточках — только пока карточка на экране; старт со сдвигом,
     чтобы соседние карточки не перезапускались в один кадр */
  useEffect(() => {
    if (mode !== 'card' || !visible || reduced || fx.autoplay !== 'reload') return;
    let t;
    const tick = () => {
      if (!real.current) reload();
      t = setTimeout(tick, LOOP_MS);
    };
    t = setTimeout(tick, LOOP_MS * (0.4 + Math.random() * 0.6));
    return () => clearTimeout(t);
  }, [mode, visible, reduced, fx.autoplay]);

  /* наведение на карточку проигрывает эффект заново (не чаще раза в 1,2 с) */
  useEffect(() => {
    if (mode !== 'card' || fx.autoplay !== 'reload') return;
    const host = wrap.current.closest('.fx-card') || wrap.current;
    const on = () => {
      const now = performance.now();
      if (now - lastReplay.current < 1200) return;
      lastReplay.current = now;
      reload();
    };
    host.addEventListener('mouseenter', on);
    return () => host.removeEventListener('mouseenter', on);
  }, [mode, fx.autoplay]);

  /* автопроигрывание (призрачный курсор, клики) — только когда превью видно */
  useEffect(() => {
    if (!loaded || !visible || reduced) return;
    const win = frame.current?.contentWindow;
    let doc;
    try { doc = win?.document; } catch { return; }
    if (!doc) return;
    return autoplay(fx.autoplay, win, doc, C, real);
  }, [loaded, visible, reduced, fx.autoplay, C]);

  const onLoad = () => {
    const win = frame.current?.contentWindow;
    let doc;
    try { doc = win?.document; } catch { return; }
    if (!doc) return;
    forwardWheel(win);
    if (mode === 'card') {
      if (href) {
        doc.addEventListener('click', e => {
          if (!e.isTrusted) return;
          e.preventDefault();
          e.stopPropagation();
          router.push(href);
        }, true);
      }
      /* движение мыши над превью передаём карточке — наклон не «замирает» над iframe */
      doc.addEventListener('mousemove', e => {
        if (!e.isTrusted || !frame.current) return;
        if (!rectRef.current) rectRef.current = frame.current.getBoundingClientRect();
        const r = rectRef.current, k = scaleRef.current;
        wrap.current.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + e.clientX * k, clientY: r.top + e.clientY * k, bubbles: true }));
      }, { passive: true });
    }
    setLoaded(n => n + 1);
  };

  /* кэш положения iframe сбрасываем при входе курсора и скролле */
  useEffect(() => {
    if (mode !== 'card') return;
    const reset = () => { rectRef.current = null; };
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('resize', reset, { passive: true });
    return () => { window.removeEventListener('scroll', reset); window.removeEventListener('resize', reset); };
  }, [mode]);

  /* масштаб: логическая ширина страницы → размер сцены */
  const phone = device === 'mobile';
  let scale = 1, fw = box.w, fh = box.h, lw = DESKTOP_W;
  if (phone) {
    fh = Math.max(0, box.h - 24);
    scale = Math.min(1, fh / PHONE_H);
    lw = PHONE_W;
    fw = PHONE_W * scale;
  } else {
    /* zoom — фиксированный масштаб: при сужении блока уменьшается логическая ширина, а не текст */
    lw = zoom ? box.w / zoom : Math.max(mode === 'card' ? CARD_W : DESKTOP_W, box.w);
    scale = box.w / lw;
  }
  scaleRef.current = scale;
  const lh = scale ? fh / scale : 0;
  const a11y = label ? {} : { 'aria-hidden': true };

  return (
    <div
      ref={wrap}
      className={`fx-frame fx-frame-${mode}${phone ? ' is-phone' : ''}`}
      onMouseEnter={() => { real.current = true; rectRef.current = null; }}
      onMouseLeave={() => { real.current = false; }}
      {...a11y}
    >
      <div className="fx-frame-screen" style={{ width: fw || '100%', height: fh || '100%' }}>
        {src && box.w > 0 && (
          <iframe
            ref={frame}
            src={src}
            title={label || `Превью эффекта ${fx.name}`}
            tabIndex={label ? 0 : -1}
            scrolling="no"
            onLoad={onLoad}
            style={{ width: lw, height: lh, transform: `scale(${scale})` }}
          />
        )}
      </div>
    </div>
  );
}
