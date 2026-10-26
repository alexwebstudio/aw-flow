'use client';
/* Общие клиентские утилиты: Lenis, блокировка скролла, «ворота» старта
   анимаций (ждут прелоадер), флаги устройства. */

let lenis = null;
export const setLenis = l => { lenis = l; };
export const getLenis = () => lenis;

let locks = 0;
export function lockScroll() {
  if (locks++ === 0) { document.documentElement.style.overflow = 'hidden'; lenis?.stop(); }
}
export function unlockScroll() {
  if (locks > 0 && --locks === 0) { document.documentElement.style.overflow = ''; lenis?.start(); }
}

export function headerOffset() {
  const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10);
  return -((v || 72) + 8);
}
export function scrollToTarget(target, immediate = false) {
  if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : headerOffset(), duration: 1.2, immediate });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: immediate ? 'auto' : 'smooth' });
  else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
}

/* Анимации hero ждут окончания прелоадера */
let ready = true;
const queue = [];
export const holdReady = () => { ready = false; };
export const releaseReady = () => { ready = true; queue.splice(0).forEach(f => f()); };
export const onReady = f => { if (ready) f(); else queue.push(f); };

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const session = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};

/* копирование в буфер: Clipboard API, а если он недоступен — через скрытое поле */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
