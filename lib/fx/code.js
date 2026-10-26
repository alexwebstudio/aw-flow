/* AW-Flow: генератор готового кода эффектов для Tilda.
   Каждый эффект — самодостаточный блок <style> + <script> на чистом JS/CSS,
   без библиотек и сборки. Значения параметров попадают в CSS-переменные
   (--awf-*), мобильные — в @media (max-width: 640px); скрипты читают эти
   переменные через getComputedStyle, поэтому мобильные значения работают и в JS.
   Этот же код без изменений проигрывается в превью на сайте. */
import { defaultClass, isVisible } from '@/lib/aw-flow';

export const MOBILE_BP = 640;

const EASE = {
  ease: 'ease',
  'power2.out': 'cubic-bezier(0.5, 1, 0.89, 1)',
  'power3.out': 'cubic-bezier(0.33, 1, 0.68, 1)',
  'expo.out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'expo.inOut': 'cubic-bezier(0.87, 0, 0.13, 1)',
  'back.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear',
};

const CHARSETS = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  cyrillic: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ',
  digits: '0123456789',
  symbols: '!<>-_/[]{}=+*^?#%&',
};

const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
const round = n => Math.round(n * 1000) / 1000;

/* валидное имя класса: латиница, цифры, дефис; начинается с буквы */
export const isValidClass = s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(String(s || ''));
export const classOf = (fx, v) => (isValidClass(v.cls) ? v.cls : defaultClass(fx));

export function parseBezier(str) {
  const n = String(str || '').split(',').map(x => Number(x.trim()));
  if (n.length !== 4 || !n.every(Number.isFinite) || n[0] < 0 || n[0] > 1 || n[2] < 0 || n[2] > 1) return null;
  return `cubic-bezier(${n.join(', ')})`;
}
const easeOf = v => (v.ease === 'custom' ? parseBezier(v.bezier) || EASE['power3.out'] : EASE[v.ease] || 'ease');

/* значение параметра в CSS: число + единица из описания (cu) или цвет */
function cssValue(p, val) {
  if (p.type === 'color') return val;
  return `${round(Number(val))}${p.cu}`;
}
const isVar = p => (p.type === 'range' && p.cu !== undefined) || p.type === 'color';

function varBlock(fx, v, sel) {
  const lines = fx.params.filter(p => isVar(p) && isVisible(p, v)).map(p => `  --awf-${kebab(p.key)}: ${cssValue(p, v[p.key])};`);
  if (fx.params.some(p => p.key === 'ease')) lines.push(`  --awf-ease: ${easeOf(v)};`);
  let out = `${sel} {\n${lines.join('\n')}\n}`;
  if (v.mobileOn) {
    const mob = fx.params
      .filter(p => p.m && isVar(p) && isVisible(p, v) && v.m?.[p.key] !== undefined && v.m[p.key] !== v[p.key])
      .map(p => `    --awf-${kebab(p.key)}: ${cssValue(p, v.m[p.key])};`);
    if (mob.length) out += `\n/* мобильные устройства */\n@media (max-width: ${MOBILE_BP}px) {\n  ${sel} {\n${mob.join('\n')}\n  }\n}`;
  }
  return out;
}

/* ---------- общие куски JS ---------- */
const READY = `  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();`;

const NUM = `  function num(el, name) { return parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0; }`;

/* разбивка текста на слова/буквы с сохранением тегов и стилей Tilda (.tn-atom) */
const SPLIT = `  function split(el, mode) {
    var root = el.querySelector('.tn-atom') || el;
    var parts = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { if (n.tagName !== 'BR') walk(n); return; }
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\\s+)/).forEach(function (chunk) {
          if (!chunk) return;
          if (/^\\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
          var w = document.createElement('span');
          w.className = 'awf-w';
          if (mode === 'chars') {
            Array.from(chunk).forEach(function (ch) {
              var c = document.createElement('span');
              c.className = 'awf-p'; c.textContent = ch; c._ch = ch;
              w.appendChild(c); parts.push(c);
            });
          } else if (mode === 'mask') {
            var inner = document.createElement('span');
            inner.className = 'awf-p'; inner.textContent = chunk;
            w.appendChild(inner); parts.push(inner);
          } else {
            w.className += ' awf-p'; w.textContent = chunk; parts.push(w);
          }
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      });
    })(root);
    parts.forEach(function (p, i) { p.style.setProperty('--i', i); });
    return parts;
  }`;

/* JS для эффектов появления: подготовка, запуск по загрузке / в экране / по наведению */
function appearJs(C, v, { helpers = '', prepare = '', play = '', stop = '' } = {}) {
  const T = v.trigger || 'view';
  const R = !!v.repeat;
  let trigger;
  if (T === 'load') {
    trigger = `    requestAnimationFrame(function () { requestAnimationFrame(function () { els.forEach(play); }); });`;
  } else if (T === 'hover') {
    trigger = `    els.forEach(function (el) {
      play(el);
      var busy = false;
      el.addEventListener('mouseenter', function () {
        if (busy) return;
        busy = true;
        stop(el);
        requestAnimationFrame(function () { play(el); });
        setTimeout(function () { busy = false; }, 700);
      });
    });`;
  } else {
    trigger = `    if (!('IntersectionObserver' in window)) { els.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { play(e.target);${R ? '' : ' io.unobserve(e.target);'} }${R ? '\n        else stop(e.target);' : ''}
      });
    }, { threshold: 0.2 });
    els.forEach(function (el) { io.observe(el); });`;
  }
  return `(function () {
  var CLS = '${C}';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${helpers ? helpers + '\n' : ''}  function prepare(el) {${prepare ? '\n' + prepare + '\n  ' : ' '}}
  function play(el) {
    el.classList.add('awf-in');${play ? '\n' + play : ''}
  }
  function stop(el) {
    // мгновенный сброс в начальное состояние, без обратной анимации
    el.classList.add('awf-off');
    el.classList.remove('awf-in');${stop ? '\n' + stop : ''}
    void el.offsetWidth;
    el.classList.remove('awf-off');
  }
  function init() {
    var els = [].slice.call(document.querySelectorAll('.' + CLS)).filter(function (el) {
      if (el.getAttribute('data-awf')) return false;
      el.setAttribute('data-awf', '1');
      prepare(el);
      el.classList.add('awf-ready');
      return true;
    });
    if (reduce) { els.forEach(play); return; }
${trigger}
  }
${READY}
})();`;
}

const OFF = C => `.${C}.awf-off,\n.${C}.awf-off * { transition: none !important; }`;
const delayI = `calc(var(--awf-delay) + var(--i, 0) * var(--awf-stagger))`;

/* ============================================================
   ЭФФЕКТЫ
   ============================================================ */
const GEN = {
  /* ---------- текст: появление ---------- */
  'text-fade'(C, v) {
    const s = Number(v.softness);
    const a = round(50 - s / 6), b = round(50 + s / 6);
    const D = {
      right: { deg: '90deg', size: '300% 100%', from: '100% 0', to: '0 0' },
      left: { deg: '270deg', size: '300% 100%', from: '0 0', to: '100% 0' },
      down: { deg: '180deg', size: '100% 300%', from: '0 100%', to: '0 0' },
      up: { deg: '0deg', size: '100% 300%', from: '0 0', to: '0 100%' },
    }[v.sweep] || {};
    const css = `.${C} {
  -webkit-mask-image: linear-gradient(${D.deg}, #000 ${a}%, transparent ${b}%);
  mask-image: linear-gradient(${D.deg}, #000 ${a}%, transparent ${b}%);
  -webkit-mask-size: ${D.size};
  mask-size: ${D.size};
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: ${D.from};
  mask-position: ${D.from};
  filter: blur(var(--awf-blur));
  transition: -webkit-mask-position var(--awf-duration) var(--awf-ease) var(--awf-delay),
    mask-position var(--awf-duration) var(--awf-ease) var(--awf-delay),
    filter var(--awf-duration) var(--awf-ease) var(--awf-delay);
}
.${C}.awf-in {
  -webkit-mask-position: ${D.to};
  mask-position: ${D.to};
  filter: blur(0);
}
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { -webkit-mask-image: none; mask-image: none; filter: none; transition: none; }` };
  },

  'text-blur'(C, v) {
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-w { display: inline-block; white-space: nowrap; }
.${C} .awf-p {
  display: inline-block;
  opacity: 0;
  filter: blur(var(--awf-blur));
  transform: translate3d(0, var(--awf-distance), 0);
  transition: opacity var(--awf-duration) var(--awf-ease), filter var(--awf-duration) var(--awf-ease), transform var(--awf-duration) var(--awf-ease);
  transition-delay: ${delayI};
}
.${C}.awf-in .awf-p { opacity: 1; filter: blur(0); transform: none; }
${OFF(C)}`;
    return {
      css,
      js: appearJs(C, v, { helpers: SPLIT, prepare: `    split(el, '${v.unit === 'chars' ? 'chars' : 'words'}');` }),
      reduced: `.${C}, .${C} .awf-p { opacity: 1 !important; filter: none !important; transform: none !important; transition: none !important; }`,
    };
  },

  'text-mask'(C, v) {
    const sign = v.rise === 'down' ? '-' : '';
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-w {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
  padding-bottom: 0.14em;
  margin-bottom: -0.14em;
}
.${C} .awf-p {
  display: inline-block;
  transform: translate3d(0, ${sign}110%, 0) rotate(${sign ? 'calc(var(--awf-rotate) * -1)' : 'var(--awf-rotate)'});
  transform-origin: 0 100%;
  transition: transform var(--awf-duration) var(--awf-ease) ${delayI};
}
.${C}.awf-in .awf-p { transform: none; }
${OFF(C)}`;
    const helpers = `${SPLIT}
  // номер строки для каждого слова — строки появляются по очереди
  function lines(el) {
    var top = null, line = -1;
    [].forEach.call(el.querySelectorAll('.awf-w'), function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { line++; top = t; }
      w.firstChild.style.setProperty('--i', line);
    });
  }`;
    const prepare = `    split(el, 'mask');
    lines(el);
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { lines(el); }, 150); });`;
    return {
      css,
      js: appearJs(C, v, { helpers, prepare }),
      reduced: `.${C}, .${C} .awf-p { opacity: 1 !important; transform: none !important; transition: none !important; }`,
    };
  },

  'text-flip'(C, v) {
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-w { display: inline-block; white-space: nowrap; }
.${C} .awf-p {
  display: inline-block;
  opacity: 0;
  transform: perspective(var(--awf-perspective)) rotateX(var(--awf-angle));
  transform-origin: 50% 100%;
  backface-visibility: hidden;
  transition: transform var(--awf-duration) var(--awf-ease), opacity calc(var(--awf-duration) * 0.5) linear;
  transition-delay: ${delayI};
}
.${C}.awf-in .awf-p { opacity: 1; transform: perspective(var(--awf-perspective)) rotateX(0deg); }
${OFF(C)}`;
    return {
      css,
      js: appearJs(C, v, { helpers: SPLIT, prepare: `    split(el, '${v.unit === 'words' ? 'words' : 'chars'}');` }),
      reduced: `.${C}, .${C} .awf-p { opacity: 1 !important; transform: none !important; transition: none !important; }`,
    };
  },

  'text-scramble'(C, v) {
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-w { display: inline-block; white-space: nowrap; }
.${C} .awf-p { display: inline-block; text-align: center; opacity: 0; }
.${C} .awf-p.awf-on { opacity: 1; }
.${C} .awf-p.awf-noise { color: var(--awf-noise); }`;
    const helpers = `${SPLIT}
${NUM}
  var SET = ${JSON.stringify(CHARSETS[v.charset] || CHARSETS.latin)};
  function rnd() { return SET.charAt(Math.floor(Math.random() * SET.length)); }
  // фиксируем ширину букв, чтобы строка не «прыгала» во время перебора
  function measure(el) {
    el._parts.forEach(function (p) { p.style.width = ''; });
    el._parts.forEach(function (p) { p.style.width = p.getBoundingClientRect().width + 'px'; });
  }`;
    const prepare = `    el._parts = split(el, 'chars');
    measure(el);
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (!el._raf) measure(el); }, 150); });`;
    const play = `    var parts = el._parts;
    if (reduce) { parts.forEach(function (p) { p.classList.add('awf-on'); }); return; }
    var dur = num(el, '--awf-duration'), step = num(el, '--awf-stagger'), delay = num(el, '--awf-delay');
    var start = performance.now(), last = 0;
    cancelAnimationFrame(el._raf);
    (function tick(now) {
      var t = now - start, done = true, swap = now - last > 50;
      if (swap) last = now;
      parts.forEach(function (p, i) {
        var s = delay + i * step;
        if (t < s) { done = false; return; }
        if (t < s + dur) {
          done = false;
          p.classList.add('awf-on', 'awf-noise');
          if (swap) p.textContent = rnd();
          return;
        }
        if (p.classList.contains('awf-noise')) { p.classList.remove('awf-noise'); p.textContent = p._ch; }
        p.classList.add('awf-on');
      });
      el._raf = done ? 0 : requestAnimationFrame(tick);
    })(start);`;
    const stop = `    cancelAnimationFrame(el._raf); el._raf = 0;
    el._parts.forEach(function (p) { p.classList.remove('awf-on', 'awf-noise'); p.textContent = p._ch; });`;
    return {
      css,
      js: appearJs(C, v, { helpers, prepare, play, stop }),
      reduced: `.${C}, .${C} .awf-p { opacity: 1 !important; }`,
    };
  },

  'text-split'(C, v) {
    const sign = v.rise === 'down' ? -1 : 1;
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-w { display: inline-block; white-space: nowrap; }
.${C} .awf-p {
  display: inline-block;
  opacity: 0;
  transform: translate3d(0, calc(var(--awf-distance) * ${sign}), 0) rotate(calc(var(--awf-rotate) * ${sign}));
  transform-origin: 0 100%;
  transition: opacity calc(var(--awf-duration) * 0.6) linear, transform var(--awf-duration) var(--awf-ease);
  transition-delay: ${delayI};
}
.${C}.awf-in .awf-p { opacity: 1; transform: none; }
${OFF(C)}`;
    return {
      css,
      js: appearJs(C, v, { helpers: SPLIT, prepare: `    split(el, '${v.unit === 'words' ? 'words' : 'chars'}');` }),
      reduced: `.${C}, .${C} .awf-p { opacity: 1 !important; transform: none !important; transition: none !important; }`,
    };
  },

  /* ---------- текст: ховер ---------- */
  'text-hover-fill'(C, v) {
    const left = v.hdir === 'left';
    let css;
    if (v.style === 'underline') {
      css = `.${C} .awf-hl {
  background-image: linear-gradient(var(--awf-color), var(--awf-color));
  background-repeat: no-repeat;
  background-position: ${left ? '100%' : '0'} 100%;
  background-size: 0% var(--awf-thickness);
  padding-bottom: 0.06em;
  transition: background-size var(--awf-duration) var(--awf-ease);
}
.${C}:hover .awf-hl { background-size: 100% var(--awf-thickness); }`;
    } else {
      css = `.${C} .awf-hl {
  background-image: linear-gradient(90deg, ${left ? 'currentColor 50%, var(--awf-color) 50%' : 'var(--awf-color) 50%, currentColor 50%'});
  background-size: 200% 100%;
  background-position: ${left ? '0' : '100%'} 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: background-position var(--awf-duration) var(--awf-ease);
}
.${C}:hover .awf-hl { background-position: ${left ? '100%' : '0'} 0; }`;
    }
    const js = `(function () {
  var CLS = '${C}';
  // оборачиваем текст элемента в строчный span — на нём рисуется заливка/линия
  function init() {
    [].forEach.call(document.querySelectorAll('.' + CLS), function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var root = el.querySelector('.tn-atom') || el;
      var span = document.createElement('span');
      span.className = 'awf-hl';
      while (root.firstChild) span.appendChild(root.firstChild);
      root.appendChild(span);
    });
  }
${READY}
})();`;
    return { css, js, reduced: `.${C} .awf-hl { transition: none; }` };
  },

  'text-hover-scramble'(C, v) {
    const css = `.${C} .awf-w { display: inline-block; white-space: nowrap; }
.${C} .awf-p { display: inline-block; text-align: center; }
.${C} .awf-p.awf-noise { color: var(--awf-noise); }`;
    const js = `(function () {
  var CLS = '${C}';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SET = ${JSON.stringify(CHARSETS[v.charset] || CHARSETS.latin)};
  function rnd() { return SET.charAt(Math.floor(Math.random() * SET.length)); }
${NUM}
${SPLIT}
  function measure(parts) {
    parts.forEach(function (p) { p.style.width = ''; });
    parts.forEach(function (p) { p.style.width = p.getBoundingClientRect().width + 'px'; });
  }
  function run(el) {
    if (el._raf) return;
    var parts = el._parts, dur = num(el, '--awf-duration'), step = num(el, '--awf-stagger');
    var start = performance.now(), last = 0;
    (function tick(now) {
      var t = now - start, done = true, swap = now - last > 50;
      if (swap) last = now;
      parts.forEach(function (p, i) {
        if (t < i * step + dur) {
          done = false;
          p.classList.add('awf-noise');
          if (swap) p.textContent = rnd();
        } else if (p.classList.contains('awf-noise')) {
          p.classList.remove('awf-noise');
          p.textContent = p._ch;
        }
      });
      el._raf = done ? 0 : requestAnimationFrame(tick);
    })(start);
  }
  function init() {
    if (reduce) return;
    [].forEach.call(document.querySelectorAll('.' + CLS), function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      el._parts = split(el, 'chars');
      measure(el._parts);
      el.addEventListener('mouseenter', function () { run(el); });
      var t;
      window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (!el._raf) measure(el._parts); }, 150); });
    });
  }
${READY}
})();`;
    return { css, js };
  },

  /* ---------- объекты: появление ---------- */
  'fade-up'(C, v) {
    const [x, y] = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[v.dir] || [0, 1];
    const css = `.${C} {
  opacity: 0;
  transform: translate3d(calc(var(--awf-distance) * ${x}), calc(var(--awf-distance) * ${y}), 0);
  transition: opacity var(--awf-duration) var(--awf-ease) var(--awf-delay),
    transform var(--awf-duration) var(--awf-ease) var(--awf-delay);
}
.${C}.awf-in { opacity: 1; transform: none; }
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { opacity: 1; transform: none; transition: none; }` };
  },

  'blur-in'(C, v) {
    const css = `.${C} {
  opacity: 0;
  filter: blur(var(--awf-blur));
  transform: scale(var(--awf-scale));
  transition: opacity var(--awf-duration) var(--awf-ease) var(--awf-delay),
    filter var(--awf-duration) var(--awf-ease) var(--awf-delay),
    transform var(--awf-duration) var(--awf-ease) var(--awf-delay);
}
.${C}.awf-in { opacity: 1; filter: blur(0); transform: none; }
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { opacity: 1; filter: none; transform: none; transition: none; }` };
  },

  'mask-wipe'(C, v) {
    const from = {
      right: 'inset(0 100% 0 0 round var(--awf-radius))',
      left: 'inset(0 0 0 100% round var(--awf-radius))',
      up: 'inset(100% 0 0 0 round var(--awf-radius))',
      down: 'inset(0 0 100% 0 round var(--awf-radius))',
    }[v.wipe];
    const css = `.${C} {
  -webkit-clip-path: ${from};
  clip-path: ${from};
  transform: scale(var(--awf-scale));
  transition: -webkit-clip-path var(--awf-duration) var(--awf-ease) var(--awf-delay),
    clip-path var(--awf-duration) var(--awf-ease) var(--awf-delay),
    transform calc(var(--awf-duration) * 1.3) cubic-bezier(0.33, 1, 0.68, 1) var(--awf-delay);
}
.${C}.awf-in {
  -webkit-clip-path: inset(0 0 0 0 round var(--awf-radius));
  clip-path: inset(0 0 0 0 round var(--awf-radius));
  transform: none;
}
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { -webkit-clip-path: none; clip-path: none; transform: none; transition: none; }` };
  },

  'scale-in'(C, v) {
    const origin = { center: '50% 50%', top: '50% 0', bottom: '50% 100%', left: '0 50%', right: '100% 50%' }[v.origin] || '50% 50%';
    const css = `.${C} {
  opacity: 0;
  transform: translate3d(0, var(--awf-distance), 0) scale(var(--awf-scale));
  transform-origin: ${origin};
  transition: opacity calc(var(--awf-duration) * 0.6) linear var(--awf-delay),
    transform var(--awf-duration) var(--awf-ease) var(--awf-delay);
}
.${C}.awf-in { opacity: 1; transform: none; }
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { opacity: 1; transform: none; transition: none; }` };
  },

  'tilt-in'(C, v) {
    const css = `.${C} {
  opacity: 0;
  transform: perspective(var(--awf-perspective)) translate3d(0, var(--awf-distance), 0) rotateX(var(--awf-angle));
  transform-origin: 50% 100%;
  transition: opacity calc(var(--awf-duration) * 0.6) linear var(--awf-delay),
    transform var(--awf-duration) var(--awf-ease) var(--awf-delay);
}
.${C}.awf-in {
  opacity: 1;
  transform: perspective(var(--awf-perspective)) translate3d(0, 0, 0) rotateX(0deg);
}
${OFF(C)}`;
    return { css, js: appearJs(C, v), reduced: `.${C} { opacity: 1; transform: none; transition: none; }` };
  },

  /* ---------- объекты: ховер ---------- */
  'hover-tilt'(C, v) {
    const css = `.${C} {
  transition: transform var(--awf-duration) var(--awf-ease);
}
.${C} .awf-glare {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}`;
    const js = `(function () {
  var CLS = '${C}';
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
  function init() {
    if (!fine || reduce) return; // на тач-экранах и при «уменьшении движения» эффект выключен
    [].forEach.call(document.querySelectorAll('.' + CLS), function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var glare = null;${v.glare ? `
      glare = document.createElement('span');
      glare.className = 'awf-glare';
      el.appendChild(glare);` : ''}
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        var a = num(el, '--awf-angle'), s = num(el, '--awf-scale') || 1, p = num(el, '--awf-perspective') || 1000;
        el.style.transform = 'perspective(' + p + 'px) rotateX(' + ((0.5 - y) * 2 * a).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 2 * a).toFixed(2) + 'deg) scale(' + s + ')';
        if (glare) {
          glare.style.opacity = 1;
          glare.style.background = 'radial-gradient(circle at ' + (x * 100).toFixed(1) + '% ' + (y * 100).toFixed(1) + '%, rgba(255,255,255,' + num(el, '--awf-glare-strength') + '), transparent 60%)';
        }
      });
      // will-change — только пока курсор над элементом
      var over = false;
      el.addEventListener('pointerenter', function () { over = true; el.style.willChange = 'transform'; });
      el.addEventListener('pointerleave', function () {
        over = false;
        el.style.transform = '';
        if (glare) glare.style.opacity = 0;
        setTimeout(function () { if (!over) el.style.willChange = ''; }, num(el, '--awf-duration') + 50);
      });
    });
  }
${READY}
})();`;
    return { css, js };
  },

  'hover-zoom'(C, v) {
    let css = `.${C} {
  overflow: hidden;
  border-radius: var(--awf-radius);
}
.${C} > * { transition: transform var(--awf-duration) var(--awf-ease); }
.${C}:hover > * { transform: scale(var(--awf-scale)); }`;
    if (v.overlay) {
      css += `
.${C}::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--awf-overlay-color);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--awf-duration) var(--awf-ease);
}
.${C}:hover::after { opacity: var(--awf-overlay-opacity); }`;
    }
    return { css, js: '', reduced: `.${C} > *, .${C}::after { transition: none; }` };
  },

  /* ---------- интерфейс ---------- */
  'custom-cursor'(C, v) {
    const css = `.${C}-dot,
.${C}-ring {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2147483647;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;${v.blend ? '\n  mix-blend-mode: difference;' : ''}
}
.${C}-dot {
  width: var(--awf-dot);
  height: var(--awf-dot);
  margin: calc(var(--awf-dot) / -2) 0 0 calc(var(--awf-dot) / -2);
  border-radius: 50%;
  background: var(--awf-color);
}
.${C}-ring {
  width: var(--awf-ring);
  height: var(--awf-ring);
  margin: calc(var(--awf-ring) / -2) 0 0 calc(var(--awf-ring) / -2);
}
.${C}-ring i {
  display: block;
  width: 100%;
  height: 100%;
  border: 1.5px solid var(--awf-color);
  border-radius: 50%;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.${C}-ring.awf-hover i { transform: scale(var(--awf-hover-scale)); opacity: 0.6; }
.${C}-dot.awf-show,
.${C}-ring.awf-show { opacity: 1; }${v.hideNative ? `
html.${C}-on,
html.${C}-on * { cursor: none !important; }` : ''}`;
    const js = `(function () {
  var CLS = '${C}';
  // только для мыши: на телефонах и планшетах курсор не нужен
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // над этими элементами кольцо увеличивается; свой элемент — класс ${C}-hover
  var HOVER = 'a, button, input, select, textarea, label, [role="button"], .t-btn, .t-submit, .' + CLS + '-hover';
  function init() {
    var dot = document.createElement('div'), ring = document.createElement('div');
    dot.className = CLS + '-dot';
    ring.className = CLS + '-ring';
    ring.appendChild(document.createElement('i'));
    document.body.appendChild(dot);
    document.body.appendChild(ring);${v.hideNative ? `
    document.documentElement.classList.add(CLS + '-on');` : ''}
    var k = parseFloat(getComputedStyle(ring).getPropertyValue('--awf-smoothing')) || 0.16;
    var x = -100, y = -100, rx = x, ry = y;
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      dot.classList.add('awf-show');
      ring.classList.add('awf-show');
      var t = e.target && e.target.closest ? e.target.closest(HOVER) : null;
      ring.classList.toggle('awf-hover', !!t);
    });
    document.documentElement.addEventListener('mouseleave', function () {
      dot.classList.remove('awf-show');
      ring.classList.remove('awf-show');
    });
    (function loop() {
      rx += (x - rx) * (reduce ? 1 : k);
      ry += (y - ry) * (reduce ? 1 : k);
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
${READY}
})();`;
    return { css, js, vars: `.${C}-dot, .${C}-ring` };
  },

  'page-fade'(C, v) {
    const css = `.${C} {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  background: var(--awf-color);
  opacity: 1;
  transition: opacity var(--awf-duration) var(--awf-ease);
}
.${C}.awf-hide { opacity: 0; }`;
    const js = `(function () {
  var CLS = '${C}';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // шторка создаётся сразу, ещё до отрисовки страницы
  var veil = document.createElement('div');
  veil.className = CLS;
  document.documentElement.appendChild(veil);
  function hide() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { veil.classList.add('awf-hide'); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide);
  else hide();
  setTimeout(function () { veil.classList.add('awf-hide'); }, 3000); // страховка
  window.addEventListener('pageshow', function (e) { if (e.persisted) veil.classList.add('awf-hide'); });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    // якоря, попапы Tilda (#popup:...), почта и телефон — без перехода
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
    if (a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.search === location.search && a.hash) return;
    e.preventDefault();
    veil.classList.remove('awf-hide');
    var d = parseFloat(getComputedStyle(veil).getPropertyValue('--awf-duration')) || 400;
    setTimeout(function () { location.href = a.href; }, d);
  });
})();`;
    return { css, js, reduced: `.${C} { display: none; }` };
  },

  'preloader-minimal'(C, v) {
    const css = `.${C} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--awf-bg);
  color: var(--awf-accent);
  transition: opacity var(--awf-fade) ease, visibility 0s linear var(--awf-fade);
}
.${C}.awf-done { opacity: 0; visibility: hidden; }
.${C}-bar {
  position: relative;
  width: var(--awf-bar-width);
  max-width: 70vw;
  height: 2px;
  overflow: hidden;
  border-radius: 2px;
}
.${C}-bar::before { content: ""; position: absolute; inset: 0; background: currentColor; opacity: 0.18; }
.${C}-bar i {
  position: absolute;
  inset: 0;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: 0 50%;
  transition: transform 0.4s ease;
}
.${C}-num { font: 500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.12em; }`;
    const js = `(function () {
  var CLS = '${C}';
  var MIN = ${Number(v.minTime)};      // минимальное время показа, мс
  var FADE = ${Number(v.fade)};        // исчезновение, мс
  var start = Date.now(), p = 0, done = false;
  var pl = document.createElement('div');
  pl.className = CLS;
  pl.setAttribute('aria-hidden', 'true');
  pl.innerHTML = '<div class="' + CLS + '-bar"><i></i></div>'${v.percent ? ` + '<div class="' + CLS + '-num">0%</div>'` : ''};
  document.documentElement.appendChild(pl);
  var bar = pl.querySelector('i'), num = pl.querySelector('.' + CLS + '-num');
  function draw() {
    bar.style.transform = 'scaleX(' + p + ')';
    if (num) num.textContent = Math.round(p * 100) + '%';
  }
  // пока страница грузится — полоса плавно приближается к 90%
  var timer = setInterval(function () { if (p < 0.9) { p += (0.9 - p) * 0.06; draw(); } }, 80);
  function finish() {
    if (done) return;
    done = true;
    clearInterval(timer);
    p = 1;
    draw();
    setTimeout(function () {
      pl.classList.add('awf-done');
      setTimeout(function () { pl.remove(); }, FADE + 50);
    }, Math.max(0, MIN - (Date.now() - start)) + 250);
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  setTimeout(finish, 10000); // страховка, если какой-то ресурс завис
})();`;
    return { css, js, reduced: `.${C}, .${C}-bar i { transition: none; }` };
  },

  'preloader-logo'(C, v) {
    const exit = v.exit === 'fade'
      ? `.${C}.awf-done { opacity: 0; visibility: hidden; }`
      : `.${C}.awf-done { transform: translate3d(0, -100%, 0); visibility: hidden; }`;
    const css = `.${C} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--awf-bg);
  color: var(--awf-color);
  transition: opacity 0.6s ease, transform 0.9s cubic-bezier(0.76, 0, 0.24, 1), visibility 0s linear 0.9s;
}
${exit}
.${C}-logo {
  display: flex;
  overflow: hidden;
  padding: 0.12em 0;
  font-family: ${String(v.font || 'Arial, sans-serif').replace(/[;{}<>\\]/g, '') || 'Arial, sans-serif'};
  font-size: var(--awf-size);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}
.${C}-logo span {
  display: inline-block;
  transform: translate3d(0, 115%, 0);
  animation: ${C}-in var(--awf-duration) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * var(--awf-stagger));
}
.${C}-logo .awf-sp { width: 0.28em; }
@keyframes ${C}-in { to { transform: none; } }`;
    const js = `(function () {
  var CLS = '${C}';
  var TEXT = ${JSON.stringify(String(v.text || 'Brand').slice(0, 40))};
  var MIN = ${Number(v.minTime)}; // минимальное время показа, мс
  var start = Date.now(), done = false;
  var pl = document.createElement('div');
  pl.className = CLS;
  pl.setAttribute('aria-hidden', 'true');
  var logo = document.createElement('div');
  logo.className = CLS + '-logo';
  Array.from(TEXT).forEach(function (ch, i) {
    var s = document.createElement('span');
    if (ch === ' ') s.className = 'awf-sp'; else s.textContent = ch;
    s.style.setProperty('--i', i);
    logo.appendChild(s);
  });
  pl.appendChild(logo);
  document.documentElement.appendChild(pl);
  function finish() {
    if (done) return;
    done = true;
    // ждём, пока буквы доедут, но не меньше MIN
    var cs = getComputedStyle(pl);
    var intro = (parseFloat(cs.getPropertyValue('--awf-duration')) || 0) + (parseFloat(cs.getPropertyValue('--awf-stagger')) || 0) * TEXT.length;
    setTimeout(function () {
      pl.classList.add('awf-done');
      setTimeout(function () { pl.remove(); }, 1000);
    }, Math.max(0, Math.max(MIN, intro) - (Date.now() - start)));
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  setTimeout(finish, 10000); // страховка
})();`;
    return { css, js, reduced: `.${C}, .${C}-logo span { transition: none; animation: none; transform: none; }` };
  },

  /* ---------- фон ---------- */
  'gradient-bg'(C) {
    const decl = `  background-image: linear-gradient(var(--awf-angle), var(--awf-c1), var(--awf-c2), var(--awf-c3), var(--awf-c1)) !important;
  background-size: var(--awf-size) var(--awf-size) !important;
  animation: ${C}-flow var(--awf-speed) ease-in-out infinite alternate;`;
    const css = `/* фигура Zero Block: фон рисуется на .tn-atom */
.${C} .tn-atom {
${decl}
}
/* обычный блок без .tn-atom */
.${C}:not(:has(.tn-atom)) {
${decl}
}
@keyframes ${C}-flow {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}`;
    return { css, js: '', reduced: `.${C}, .${C} .tn-atom { animation: none !important; }` };
  },
};

/* Полный код для вставки в Tilda. */
export function buildCode(fx, v) {
  const C = classOf(fx, v);
  const g = GEN[fx.slug](C, v);
  const head = `<!-- AW-Flow — ${fx.name} · ${fx.scope === 'site' ? `код для всего сайта, префикс классов: ${C}` : `класс элемента: ${C}`} -->`;
  let css = `${varBlock(fx, v, g.vars || `.${C}`)}\n${g.css}`;
  if (g.reduced) css += `\n/* уважение к настройке «уменьшить движение» */\n@media (prefers-reduced-motion: reduce) {\n  ${g.reduced}\n}`;
  let out = `${head}\n<style>\n${css}\n</style>`;
  if (g.js) out += `\n<script>\n${g.js}\n</script>`;
  return out;
}
