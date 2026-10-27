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

/* ============================================================
   GSAP-ЭФФЕКТЫ (GSAP 3.15 + ScrollTrigger / SplitText из CDN)
   ============================================================ */
export const GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/';

const GEASE = {
  'power2.out': 'power2.out', 'power3.out': 'power3.out', 'expo.out': 'expo.out', 'expo.inOut': 'expo.inOut',
  'back.out': 'back.out(1.7)', 'elastic.out': 'elastic.out(1, 0.45)', linear: 'none',
};
const gEase = v => GEASE[v.ease] || 'power3.out';

const NO_GSAP = `  if (!window.gsap) { console.warn('AW-Flow: сначала подключите GSAP'); return; }`;

/* запуск таймлайна эффекта: при загрузке / при появлении в экране / по наведению.
   build(el) возвращает остановленный таймлайн в начальном состоянии. */
function gsapAppearJs(C, v, { plugins = [], helpers = '', build }) {
  const T = v.trigger || 'view';
  const R = !!v.repeat;
  const reg = [...plugins, ...(T === 'view' ? ['ScrollTrigger'] : [])];
  let trig;
  if (T === 'load') trig = `      tl.play();`;
  else if (T === 'hover') trig = `      tl.progress(1);
      el.addEventListener('mouseenter', function () { if (!tl.isActive()) tl.restart(); });`;
  else trig = R
    ? `      ScrollTrigger.create({
        trigger: el, start: 'top 88%', end: 'bottom 12%',
        onEnter: function () { tl.restart(); }, onEnterBack: function () { tl.restart(); },
        onLeave: function () { tl.pause(0); }, onLeaveBack: function () { tl.pause(0); }
      });`
    : `      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { tl.play(); } });`;
  return `(function () {
  var CLS = '${C}';
${NO_GSAP}
${reg.length ? `  gsap.registerPlugin(${reg.join(', ')});\n` : ''}  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
${helpers ? helpers + '\n' : ''}  function build(el) {
${build}
  }
  function init() {
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var tl = build(el);
      el.classList.add('awf-ready');
      if (reduce) { tl.progress(1); return; }
${trig}
    });
  }
${READY}
})();`;
}

Object.assign(GEN, {
  'text-typewriter'(C, v) {
    let css = `.${C}:not(.awf-ready) { opacity: 0; }`;
    if (v.caret) css += `
.${C} .awf-caret {
  display: inline-block;
  width: 0.06em;
  height: 1em;
  margin-left: 0.06em;
  vertical-align: -0.12em;
  background: var(--awf-caret-color);
  animation: ${C}-blink 1s steps(1) infinite;
}
@keyframes ${C}-blink { 50% { opacity: 0; } }`;
    const build = `    var root = el.querySelector('.tn-atom') || el;
    var split = SplitText.create(root, { type: 'words,chars' });
    var tl = gsap.timeline({ paused: true });
    gsap.set(split.chars, { opacity: 0 });${v.caret ? `
    var caret = document.createElement('span');
    caret.className = 'awf-caret';
    root.appendChild(caret);` : ''}
    tl.to(split.chars, { opacity: 1, duration: 0.01, ease: 'none', stagger: num(el, '--awf-speed') / 1000 }, num(el, '--awf-delay') / 1000);
    return tl;`;
    return { css, js: gsapAppearJs(C, v, { plugins: ['SplitText'], build }), gsap: ['SplitText'], reduced: `.${C} .awf-caret { animation: none; }` };
  },

  'text-marker'(C, v) {
    const css = `.${C}:not(.awf-ready) { opacity: 0; }
.${C} .awf-word { position: relative; z-index: 0; }
.${C} .awf-mk {
  position: absolute;
  left: -0.06em;
  right: -0.06em;
  bottom: 0.06em;
  height: var(--awf-thickness);
  z-index: -1;
  border-radius: 2px;
  background: var(--awf-color);
  transform: scaleX(0);
  transform-origin: 0 50%;
}`;
    const build = `    var root = el.querySelector('.tn-atom') || el;
    var split = SplitText.create(root, { type: 'words', wordsClass: 'awf-word' });
    var words = split.words${v.onlyBold ? `.filter(function (w) { return w.closest('b, strong'); })` : ''};
    if (!words.length) words = split.words;
    var marks = words.map(function (w) {
      var m = document.createElement('span');
      m.className = 'awf-mk';
      w.appendChild(m);
      return m;
    });
    var tl = gsap.timeline({ paused: true });
    tl.fromTo(marks, { scaleX: 0 }, { scaleX: 1, duration: num(el, '--awf-duration') / 1000, ease: '${gEase(v)}', stagger: num(el, '--awf-stagger') / 1000 }, num(el, '--awf-delay') / 1000);
    return tl;`;
    return { css, js: gsapAppearJs(C, v, { plugins: ['SplitText'], build }), gsap: ['SplitText'], reduced: `.${C} .awf-mk { transform: none !important; }` };
  },

  'text-counter'(C, v) {
    const css = `.${C} { font-variant-numeric: tabular-nums; }`;
    const build = `    var root = el.querySelector('.tn-atom') || el;
    var tl = gsap.timeline({ paused: true });
    // первое число в тексте; всё вокруг него (+, %, слова) остаётся как есть
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), node, m;
    while ((node = walker.nextNode())) { m = node.textContent.match(/\\d[\\d\\s\\u00a0]*\\d|\\d/); if (m) break; }
    if (!m) return tl;
    var before = node.textContent.slice(0, m.index), after = node.textContent.slice(m.index + m[0].length);
    var end = parseInt(m[0].replace(/\\D/g, ''), 10), o = { v: ${Number(v.from) || 0} };
    function fmt(n) {
      var s = String(Math.round(n));
      return ${v.separator ? `s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '\\u00a0')` : 's'};
    }
    function draw() { node.textContent = before + fmt(o.v) + after; }
    draw();
    tl.to(o, { v: end, duration: num(el, '--awf-duration') / 1000, ease: '${gEase(v)}', onUpdate: draw }, num(el, '--awf-delay') / 1000);
    return tl;`;
    return { css, js: gsapAppearJs(C, v, { build }), gsap: [] };
  },

  'text-hover-glitch'(C) {
    const css = `.${C} .awf-gl { position: relative; display: inline-block; }
.${C} .awf-gl::before,
.${C} .awf-gl::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}
.${C} .awf-gl::before { color: var(--awf-color1); clip-path: inset(0 0 52% 0); }
.${C} .awf-gl::after { color: var(--awf-color2); clip-path: inset(48% 0 0 0); }
.${C}:hover .awf-gl::before { opacity: 0.9; animation: ${C}-a var(--awf-duration) steps(2) infinite; }
.${C}:hover .awf-gl::after { opacity: 0.9; animation: ${C}-b var(--awf-duration) steps(2) infinite; }
@keyframes ${C}-a {
  0%, 100% { transform: translate3d(0, 0, 0); }
  33% { transform: translate3d(calc(var(--awf-shift) * -1), 1px, 0); }
  66% { transform: translate3d(var(--awf-shift), -1px, 0); }
}
@keyframes ${C}-b {
  0%, 100% { transform: translate3d(0, 0, 0); }
  33% { transform: translate3d(var(--awf-shift), -1px, 0); }
  66% { transform: translate3d(calc(var(--awf-shift) * -1), 1px, 0); }
}`;
    const js = `(function () {
  var CLS = '${C}';
  // копия текста в data-text — из неё рисуются цветные «сбоящие» слои
  function init() {
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var root = el.querySelector('.tn-atom') || el;
      var span = document.createElement('span');
      span.className = 'awf-gl';
      span.setAttribute('data-text', root.textContent.trim());
      while (root.firstChild) span.appendChild(root.firstChild);
      root.appendChild(span);
    });
  }
${READY}
})();`;
    return { css, js, reduced: `.${C} .awf-gl::before, .${C} .awf-gl::after { display: none; }` };
  },

  'stagger-grid'(C, v) {
    const R = !!v.repeat;
    const css = `.${C} { opacity: 0; }`;
    const js = `(function () {
  var CLS = '${C}';
${NO_GSAP}
  gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
  function init() {
    var els = [].slice.call(document.querySelectorAll('.' + CLS)).filter(function (el) {
      if (el.getAttribute('data-awf')) return false;
      el.setAttribute('data-awf', '1');
      return true;
    });
    if (!els.length) return;
    if (reduce) { gsap.set(els, { opacity: 1 }); return; }
    var from = { opacity: 0, y: num(els[0], '--awf-distance'), scale: num(els[0], '--awf-scale') || 1 };
    gsap.set(els, from);
    // одна группа триггеров на все карточки: появляются пачками, каскадом
    ScrollTrigger.batch(els, {
      start: 'top 90%',${R ? '' : '\n      once: true,'}
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: num(els[0], '--awf-duration') / 1000, ease: '${gEase(v)}', stagger: num(els[0], '--awf-stagger') / 1000, overwrite: true });
      }${R ? `,
      onLeaveBack: function (batch) { gsap.set(batch, Object.assign({ overwrite: true }, from)); }` : ''}
    });
  }
${READY}
})();`;
    return { css, js, gsap: ['ScrollTrigger'], reduced: `.${C} { opacity: 1 !important; transform: none !important; }` };
  },

  'magnetic-button'(C, v) {
    const css = `.${C} { touch-action: manipulation; }
.${C} > span { display: inline-block; }`;
    const js = `(function () {
  var CLS = '${C}';
${NO_GSAP}
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
  function init() {
    if (!fine || reduce) return; // на тач-экранах и при «уменьшении движения» выключено
    var items = [];
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var d = num(el, '--awf-duration') / 1000;
      var it = { el: el, k: num(el, '--awf-strength'), pad: num(el, '--awf-radius'), on: false,
        x: gsap.quickTo(el, 'x', { duration: d, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: d, ease: 'power3.out' }) };${v.inner ? `
      var inner = el.querySelector('.tn-atom') || el.firstElementChild;
      if (inner && inner !== el) {
        it.ix = gsap.quickTo(inner, 'x', { duration: d, ease: 'power3.out' });
        it.iy = gsap.quickTo(inner, 'y', { duration: d, ease: 'power3.out' });
      }` : ''}
      items.push(it);
    });
    // размеры читаем при скролле/ресайзе, а не на каждое движение мыши
    function measure() {
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        it.cx = r.left + r.width / 2 - (gsap.getProperty(it.el, 'x') || 0);
        it.cy = r.top + r.height / 2 - (gsap.getProperty(it.el, 'y') || 0);
        it.hw = r.width / 2 + it.pad;
        it.hh = r.height / 2 + it.pad;
      });
    }
    var raf = 0;
    function later() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; measure(); }); }
    measure();
    window.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later, { passive: true });
    document.addEventListener('pointermove', function (e) {
      items.forEach(function (it) {
        var dx = e.clientX - it.cx, dy = e.clientY - it.cy;
        var inside = Math.abs(dx) < it.hw && Math.abs(dy) < it.hh;
        if (!inside && !it.on) return;
        it.on = inside;
        var tx = inside ? dx * it.k : 0, ty = inside ? dy * it.k : 0;
        it.x(tx); it.y(ty);
        if (it.ix) { it.ix(tx * 0.5); it.iy(ty * 0.5); }
      });
    }, { passive: true });
  }
${READY}
})();`;
    return { css, js, gsap: [] };
  },

  'spotlight'(C) {
    const css = `.${C} { overflow: hidden; }
.${C} .awf-spot {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  width: var(--awf-size);
  height: var(--awf-size);
  margin: calc(var(--awf-size) / -2) 0 0 calc(var(--awf-size) / -2);
  border-radius: 50%;
  background: radial-gradient(circle, var(--awf-color) 0%, transparent 65%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}
.${C}.awf-lit .awf-spot { opacity: var(--awf-intensity); }`;
    const js = `(function () {
  var CLS = '${C}';
${NO_GSAP}
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
  function init() {
    if (!fine || reduce) return;
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var spot = document.createElement('span');
      spot.className = 'awf-spot';
      el.appendChild(spot);
      var d = num(el, '--awf-duration') / 1000;
      var qx = gsap.quickTo(spot, 'x', { duration: d, ease: 'power3.out' });
      var qy = gsap.quickTo(spot, 'y', { duration: d, ease: 'power3.out' });
      var rect = null;
      // пятно двигается через transform; размер карточки — один раз при входе курсора
      el.addEventListener('pointermove', function (e) {
        if (!rect) { rect = el.getBoundingClientRect(); el.classList.add('awf-lit'); }
        qx(e.clientX - rect.left);
        qy(e.clientY - rect.top);
      }, { passive: true });
      el.addEventListener('pointerleave', function () { rect = null; el.classList.remove('awf-lit'); });
      window.addEventListener('scroll', function () { rect = null; }, { passive: true });
    });
  }
${READY}
})();`;
    return { css, js, gsap: [] };
  },

  'border-draw'(C, v) {
    const seq = v.order !== 'all';
    const dl = k => (seq ? `\n  transition-delay: calc(var(--awf-duration) * ${k});` : '');
    const css = `.${C} .awf-b {
  position: absolute;
  z-index: 2;
  background: var(--awf-color);
  pointer-events: none;
  transition: transform var(--awf-duration) var(--awf-ease);
}
.${C} .awf-bt { left: 0; top: 0; width: 100%; height: var(--awf-thickness); transform: scaleX(0); transform-origin: 0 50%; }
.${C} .awf-br { right: 0; top: 0; width: var(--awf-thickness); height: 100%; transform: scaleY(0); transform-origin: 50% 0;${dl(0.25)} }
.${C} .awf-bb { right: 0; bottom: 0; width: 100%; height: var(--awf-thickness); transform: scaleX(0); transform-origin: 100% 50%;${dl(0.5)} }
.${C} .awf-bl { left: 0; bottom: 0; width: var(--awf-thickness); height: 100%; transform: scaleY(0); transform-origin: 50% 100%;${dl(0.75)} }
.${C}:hover .awf-b { transform: none; }`;
    const js = `(function () {
  var CLS = '${C}';
  // четыре линии рамки; рисуются через transform: scale
  function init() {
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      ['bt', 'br', 'bb', 'bl'].forEach(function (s) {
        var b = document.createElement('span');
        b.className = 'awf-b awf-' + s;
        el.appendChild(b);
      });
    });
  }
${READY}
})();`;
    return { css, js, reduced: `.${C} .awf-b { transition: none; }` };
  },

  'marquee'(C, v) {
    const right = v.mdir === 'right';
    const css = `.${C} { overflow: hidden; }
.${C} .awf-track { display: flex; width: max-content; will-change: transform; }
.${C} .awf-item { flex: none; padding-right: var(--awf-gap); white-space: nowrap; }`;
    const js = `(function () {
  var CLS = '${C}';
${NO_GSAP}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
${NUM}
  function init() {
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var root = el.querySelector('.tn-atom') || el;
      var item = '<span class="awf-item">' + root.innerHTML + '</span>';
      var track = document.createElement('div');
      track.className = 'awf-track';
      track.innerHTML = item;
      root.innerHTML = '';
      root.appendChild(track);
      // половина ленты не короче видимой ширины, вторая половина — её копия: шов не виден
      var w = track.firstChild.getBoundingClientRect().width || 1;
      var n = Math.max(1, Math.ceil(root.getBoundingClientRect().width / w));
      var half = new Array(n + 1).join(item);
      track.innerHTML = half + half;
      if (reduce) return;
      var tw = gsap.fromTo(track, { xPercent: ${right ? -50 : 0} }, { xPercent: ${right ? 0 : -50}, duration: num(el, '--awf-speed'), ease: 'none', repeat: -1 });
      // вне экрана — пауза
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { es[0].isIntersecting ? tw.play() : tw.pause(); }).observe(el);
      }${v.slowHover ? `
      el.addEventListener('mouseenter', function () { gsap.to(tw, { timeScale: 0.25, duration: 0.6 }); });
      el.addEventListener('mouseleave', function () { gsap.to(tw, { timeScale: 1, duration: 0.6 }); });` : ''}
    });
  }
${READY}
})();`;
    return { css, js, gsap: [] };
  },

  'preloader-counter'(C, v) {
    const center = v.place === 'center';
    const css = `.${C} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: ${center ? 'center' : 'flex-end'};
  justify-content: ${center ? 'center' : 'flex-end'};
  padding: 4vw;
  background: var(--awf-bg);
  color: var(--awf-color);
  transition: opacity var(--awf-fade) ease, visibility 0s linear var(--awf-fade);
}
.${C}.awf-done { opacity: 0; visibility: hidden; }
.${C}-num {
  font: 700 var(--awf-size) / 0.9 system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}`;
    const js = `(function () {
  var CLS = '${C}';
  var MIN = ${Number(v.minTime)}; // минимальное время показа, мс
  var start = Date.now(), p = 0, done = false;
  var pl = document.createElement('div');
  pl.className = CLS;
  pl.setAttribute('aria-hidden', 'true');
  pl.innerHTML = '<div class="' + CLS + '-num">0%</div>';
  document.documentElement.appendChild(pl);
  var num = pl.firstChild;
  function draw() { num.textContent = Math.round(p * 100) + '%'; }
  // пока страница грузится — счёт плавно идёт к 90%, после загрузки добегает до 100%
  var timer = setInterval(function () { if (p < 0.9) { p += (0.9 - p) * 0.05; draw(); } }, 60);
  function finish() {
    if (done) return;
    done = true;
    clearInterval(timer);
    var wait = Math.max(0, MIN - (Date.now() - start));
    var t0 = Date.now(), from = p;
    var tick = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / Math.max(300, wait));
      p = from + (1 - from) * k;
      draw();
      if (k < 1) return;
      clearInterval(tick);
      pl.classList.add('awf-done');
      setTimeout(function () { pl.remove(); }, ${Number(v.fade)} + 50);
    }, 30);
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  setTimeout(finish, 10000); // страховка
})();`;
    return { css, js, reduced: `.${C} { transition: none; }` };
  },

  'preloader-curtain'(C, v) {
    const vert = v.split !== 'horizontal';
    const css = `.${C} { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
.${C}-a,
.${C}-b {
  position: absolute;
  ${vert ? 'left: 0; right: 0; height: 50.5%;' : 'top: 0; bottom: 0; width: 50.5%;'}
  background: var(--awf-bg);
  transition: transform var(--awf-duration) cubic-bezier(0.76, 0, 0.24, 1);
}
.${C}-a { ${vert ? 'top: 0;' : 'left: 0;'} }
.${C}-b { ${vert ? 'bottom: 0;' : 'right: 0;'} }
.${C}-t {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--awf-color);
  font: 700 clamp(28px, 6vw, 72px) / 1 system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  letter-spacing: -0.03em;
  transition: opacity 0.4s ease;
}
.${C}.awf-done .${C}-a { transform: ${vert ? 'translate3d(0, -100%, 0)' : 'translate3d(-100%, 0, 0)'}; }
.${C}.awf-done .${C}-b { transform: ${vert ? 'translate3d(0, 100%, 0)' : 'translate3d(100%, 0, 0)'}; }
.${C}.awf-done .${C}-t { opacity: 0; }`;
    const js = `(function () {
  var CLS = '${C}';
  var TEXT = ${JSON.stringify(String(v.text || '').slice(0, 40))};
  var MIN = ${Number(v.minTime)}; // минимальное время показа, мс
  var start = Date.now(), done = false;
  var pl = document.createElement('div');
  pl.className = CLS;
  pl.setAttribute('aria-hidden', 'true');
  pl.innerHTML = '<div class="' + CLS + '-a"></div><div class="' + CLS + '-b"></div>' + (TEXT ? '<div class="' + CLS + '-t"></div>' : '');
  if (TEXT) pl.lastChild.textContent = TEXT;
  document.documentElement.appendChild(pl);
  function finish() {
    if (done) return;
    done = true;
    setTimeout(function () {
      pl.classList.add('awf-done');
      var d = parseFloat(getComputedStyle(pl.firstChild).getPropertyValue('--awf-duration')) || 900;
      setTimeout(function () { pl.remove(); }, d + 100);
    }, Math.max(0, MIN - (Date.now() - start)));
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  setTimeout(finish, 10000); // страховка
})();`;
    return { css, js, reduced: `.${C}-a, .${C}-b, .${C}-t { transition: none; }` };
  },

  'preloader-words'(C, v) {
    const words = String(v.words || '').split(',').map(w => w.trim()).filter(Boolean).slice(0, 12);
    const css = `.${C} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--awf-bg);
  color: var(--awf-color);
  transition: transform 0.9s cubic-bezier(0.76, 0, 0.24, 1), visibility 0s linear 0.9s;
}
.${C}.awf-done { transform: translate3d(0, -100%, 0); visibility: hidden; }
.${C}-w {
  font: 600 var(--awf-size) / 1 system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  letter-spacing: -0.03em;
  animation: ${C}-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes ${C}-in { from { opacity: 0; transform: translate3d(0, 0.3em, 0); } }`;
    const js = `(function () {
  var CLS = '${C}';
  var WORDS = ${JSON.stringify(words.length ? words : ['Привет'])};
  var STEP = ${Number(v.interval)}; // смена слова, мс
  var MIN = ${Number(v.minTime)};   // минимальное время показа, мс
  var start = Date.now(), done = false, i = 0;
  var pl = document.createElement('div');
  pl.className = CLS;
  pl.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(pl);
  function show() {
    var w = document.createElement('div');
    w.className = CLS + '-w';
    w.textContent = WORDS[i % WORDS.length];
    pl.innerHTML = '';
    pl.appendChild(w);
    i++;
  }
  show();
  var timer = setInterval(show, STEP);
  function finish() {
    if (done) return;
    done = true;
    setTimeout(function () {
      clearInterval(timer);
      pl.classList.add('awf-done');
      setTimeout(function () { pl.remove(); }, 1000);
    }, Math.max(0, MIN - (Date.now() - start)));
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  setTimeout(finish, 10000); // страховка
})();`;
    return { css, js, reduced: `.${C} { transition: none; } .${C}-w { animation: none; }` };
  },

  'floating-blobs'(C, v) {
    const css = `.${C} .tn-atom { position: relative; overflow: hidden; }
.${C}:not(:has(.tn-atom)) { overflow: hidden; }
.${C} .awf-blobs { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.${C} .awf-blob {
  position: absolute;
  width: var(--awf-size);
  aspect-ratio: 1;
  border-radius: 50%;
  opacity: var(--awf-opacity);
  will-change: transform;
  animation: ${C}-float var(--awf-speed) ease-in-out infinite alternate;
}
.${C} .awf-blob:nth-child(odd) { background: radial-gradient(circle, var(--awf-c1) 0%, transparent 68%); }
.${C} .awf-blob:nth-child(even) { background: radial-gradient(circle, var(--awf-c2) 0%, transparent 68%); }
.${C}.awf-paused .awf-blob { animation-play-state: paused; }
@keyframes ${C}-float {
  0% { transform: translate3d(-50%, -50%, 0) scale(1); }
  50% { transform: translate3d(-20%, -75%, 0) scale(1.15); }
  100% { transform: translate3d(-75%, -30%, 0) scale(0.9); }
}`;
    const js = `(function () {
  var CLS = '${C}';
  var SPOTS = [[25, 30], [72, 65], [62, 22], [20, 75], [85, 35], [48, 52]];
  function init() {
    document.querySelectorAll('.' + CLS).forEach(function (el) {
      if (el.getAttribute('data-awf')) return;
      el.setAttribute('data-awf', '1');
      var root = el.querySelector('.tn-atom') || el;
      var box = document.createElement('div');
      box.className = 'awf-blobs';
      var n = ${Math.round(Number(v.count) || 4)}; // количество пятен
      for (var i = 0; i < n; i++) {
        var b = document.createElement('span');
        b.className = 'awf-blob';
        b.style.left = SPOTS[i % 6][0] + '%';
        b.style.top = SPOTS[i % 6][1] + '%';
        b.style.animationDelay = (i * -2.3) + 's';
        b.style.animationDuration = 'calc(var(--awf-speed) * ' + (1 + i * 0.17).toFixed(2) + ')';
        box.appendChild(b);
      }
      root.insertBefore(box, root.firstChild);
      // вне экрана — пауза
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { el.classList.toggle('awf-paused', !es[0].isIntersecting); }).observe(el);
      }
    });
  }
${READY}
})();`;
    return { css, js, reduced: `.${C} .awf-blob { animation: none; }` };
  },
});

/* Разметка-пример для варианта «Для сайта (код)» */
const WEB_MARKUP = {
  heading: C => `<h2 class="${C}">Ваш заголовок</h2>`,
  hoverText: C => `<a class="${C}" href="#">Ссылка в меню</a>`,
  stats: C => `<div class="${C}">12 000+ клиентов</div>`,
  cards: C => `<div class="${C}" style="position: relative">Карточка</div>`,
  grid: C => [1, 2, 3, 4, 5, 6].map(i => `<div class="${C}">Карточка ${i}</div>`).join('\n'),
  card: C => `<div class="${C}" style="position: relative">Карточка</div>`,
  gallery: C => `<div class="${C}" style="position: relative">\n  <img src="photo.jpg" alt="">\n</div>`,
  button: C => `<a class="${C}" href="#"><span>Оставить заявку</span></a>`,
  marquee: C => `<div class="${C}">Бегущая строка · AW-Flow ·</div>`,
  block: C => `<section class="${C}" style="position: relative; min-height: 60vh"></section>`,
};

/* Какие скрипты GSAP нужны эффекту (пусто — эффект на чистом CSS/JS) */
export function gsapScripts(js) {
  if (!js || !/\bgsap\./.test(js)) return [];
  return ['gsap', ...['ScrollTrigger', 'SplitText'].filter(p => js.includes(p))];
}

/* Полный код эффекта.
   target: 'tilda' — для HTML-блока Tilda (класс на элементе Zero Block);
           'web'   — для сайта на коде: тот же CSS/JS + пример разметки.
   Превью проигрывает вариант 'tilda'; поведение у вариантов одинаковое. */
export function buildCode(fx, v, target = 'tilda') {
  const C = classOf(fx, v);
  const g = GEN[fx.slug](C, v);
  const site = fx.scope === 'site';
  const web = target === 'web';
  const where = site ? `код для всего сайта, префикс классов: ${C}` : `класс элемента: ${C}`;
  const parts = [`<!-- AW-Flow — ${fx.name} · ${web ? 'для сайта на коде' : 'для Tilda'} · ${where} -->`];
  if (web && !site) parts.push(`<!-- 1. Разметка: класс ${C} на нужном элементе -->\n${(WEB_MARKUP[fx.demo] || WEB_MARKUP.heading)(C)}`);
  let css = `${varBlock(fx, v, g.vars || `.${C}`)}\n${g.css}`;
  if (g.reduced) css += `\n/* уважение к настройке «уменьшить движение» */\n@media (prefers-reduced-motion: reduce) {\n  ${g.reduced}\n}`;
  parts.push(`${web && !site ? '<!-- 2. Стили -->\n' : ''}<style>\n${css}\n</style>`);
  const libs = gsapScripts(g.js);
  if (libs.length) {
    parts.push(`<!-- ${web && !site ? '3. ' : ''}GSAP ${GSAP_CDN.match(/gsap@([\d.]+)/)[1]} из CDN — один раз на страницу. Если он уже подключён другим эффектом, эти строки можно удалить -->\n`
      + libs.map(l => `<script src="${GSAP_CDN}${l}.min.js"></script>`).join('\n'));
  }
  if (g.js) parts.push(`${web && !site ? `<!-- ${libs.length ? 4 : 3}. Скрипт эффекта -->\n` : ''}<script>\n${g.js}\n</script>`);
  return parts.join('\n');
}
