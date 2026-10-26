/* AW-Flow: демо-страница для превью. Внутри — разметка, похожая на Zero Block
   (элемент с классом эффекта и вложенным .tn-atom), и ровно тот код, который
   пользователь копирует в Tilda. Ничего «нарисованного»: эффект работает так же,
   как на опубликованной странице. */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BASE = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{font-family:var(--fb),system-ui,sans-serif;color:#0c0c14;background:#fbfbfd;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.d-wrap{height:100vh;display:flex;flex-direction:column;justify-content:center;padding:6vh clamp(24px,7vw,72px);overflow:hidden}
.d-k{font:500 13px/1 var(--fm),ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#5b3df5;margin-bottom:24px}
.d-h{font-family:var(--fh),system-ui,sans-serif;font-weight:400;font-size:72px;line-height:1.02;letter-spacing:-.04em;max-width:12.5ch}
.d-p{margin-top:26px;font-size:19px;line-height:1.6;color:#3b3b48;max-width:44ch}
.d-hint{position:fixed;left:18px;bottom:16px;z-index:5;font:500 12px/1 var(--fm),ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#9b9ba8;pointer-events:none}
.d-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
.d-card{position:relative;padding:16px;border:1px solid rgba(12,12,22,.08);border-radius:16px;background:#fff;box-shadow:0 24px 50px -36px rgba(40,30,90,.45)}
.d-img{display:block;height:min(230px,36vh);border-radius:10px;background:radial-gradient(70% 60% at 30% 25%,rgba(255,255,255,.55),transparent 60%),linear-gradient(150deg,#9b86ff,#5b3df5)}
.d-card:nth-child(2) .d-img{background:radial-gradient(60% 60% at 70% 30%,rgba(255,255,255,.6),transparent 60%),linear-gradient(150deg,#8fd3ff,#7c5cff)}
.d-card:nth-child(3) .d-img{background:radial-gradient(60% 60% at 40% 70%,rgba(255,255,255,.5),transparent 60%),linear-gradient(150deg,#5fd394,#2f7fd8)}
.d-ct{display:block;margin-top:16px;font-family:var(--fh),system-ui,sans-serif;font-size:22px;letter-spacing:-.02em}
.d-cs{display:block;margin-top:6px;font-size:14px;color:#6c6c7a}
.d-center{height:100vh;display:flex;align-items:center;justify-content:center;padding:40px}
.d-single{width:380px}
.d-single .d-img{height:min(280px,42vh)}
.d-links{display:flex;flex-direction:column;gap:18px}
.d-link{font-family:var(--fh),system-ui,sans-serif;font-size:64px;line-height:1.05;letter-spacing:-.04em;cursor:pointer;width:max-content;max-width:100%}
.d-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.d-tile{position:relative;height:min(340px,62vh);cursor:pointer}
.d-tile .tn-atom{height:100%}
.d-tile .d-img{height:100%;border-radius:0}
.d-nav{display:flex;justify-content:space-between;align-items:center;padding:24px 72px;border-bottom:1px solid rgba(12,12,22,.08)}
.d-logo{font:800 20px/1 var(--fh),system-ui,sans-serif;letter-spacing:-.02em}
.d-menu{display:flex;gap:28px;font-size:15px}
.d-menu a{color:#3b3b48;text-decoration:none}
.d-btns{display:flex;gap:14px;margin-top:34px}
.d-btn{display:inline-flex;align-items:center;height:54px;padding:0 26px;border-radius:8px;background:#0c0c14;color:#fff;font-size:16px;text-decoration:none}
.d-btn.ghost{background:transparent;color:#0c0c14;border:1px solid rgba(12,12,22,.2)}
.d-page{height:calc(100vh - 81px);overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:56px 72px}
.d-go{display:inline-flex;margin-top:34px;font-size:18px;color:#5b3df5;text-decoration:none;border-bottom:1px solid currentColor;width:max-content}
.d-block{position:relative;height:calc(100vh - 112px);margin:56px;border-radius:24px;overflow:hidden}
.d-block-txt{position:absolute;left:56px;bottom:52px;z-index:2}
.d-block-txt .d-h{font-size:64px}
@media (max-width:560px){
  .d-wrap,.d-page{padding:5vh 22px}
  .d-h{font-size:42px}
  .d-p{font-size:16px}
  .d-cards,.d-gallery{grid-template-columns:1fr;gap:18px}
  .d-img{height:min(170px,17vh)}
  .d-tile{height:min(220px,24vh)}
  .d-link{font-size:40px}
  .d-nav{padding:18px 22px}
  .d-menu{display:none}
  .d-btns{flex-direction:column}
  .d-block{margin:22px;height:calc(100vh - 44px)}
  .d-block-txt{left:24px;bottom:28px}
  .d-block-txt .d-h{font-size:38px}
  .d-single{width:100%}
}`;

const atom = (C, inner, cls = '') => `<div class="${C}${cls ? ' ' + cls : ''}"><div class="tn-atom">${inner}</div></div>`;

function heading(C) {
  return `<div class="d-wrap">
  <p class="d-k">Новый релиз</p>
  ${atom(C, 'Сайт, который хочется листать дальше', 'd-h')}
  <p class="d-p">Живое движение подчёркивает смысл и ведёт взгляд по странице — без лишнего шума.</p>
</div>`;
}

function cards(C) {
  const card = (t, s) => atom(C, `<span class="d-img"></span><span class="d-ct">${t}</span><span class="d-cs">${s}</span>`, 'd-card');
  return `<div class="d-wrap"><p class="d-k">Проекты</p><div class="d-cards">
  ${card('Брендинг', 'Айдентика для кофейни')}
  ${card('Лендинг', 'Запуск онлайн-курса')}
  ${card('Магазин', 'Каталог мебели')}
</div></div>`;
}

const DEMOS = {
  heading: C => heading(C),
  cards: C => cards(C),
  hoverText: C => `<div class="d-wrap">
  <p class="d-k">Меню проекта</p>
  <div class="d-links">
    ${atom(C, 'Смотреть проекты', 'd-link')}
    ${atom(C, 'Услуги и цены', 'd-link')}
    ${atom(C, 'Связаться с нами', 'd-link')}
  </div>
</div>
<p class="d-hint">Наведите курсор на строку</p>`,
  card: C => `<div class="d-center">
  ${atom(C, '<span class="d-img"></span><span class="d-ct">Коллекция «Свет»</span><span class="d-cs">Наведите и поводите курсором</span>', 'd-card d-single')}
</div>`,
  gallery: C => `<div class="d-wrap">
  <p class="d-k">Галерея</p>
  <div class="d-gallery">
    ${[1, 2, 3].map(i => `<div class="${C} d-tile d-card" style="padding:0;border:0"><div class="tn-atom"><span class="d-img"></span></div></div>`).join('\n    ')}
  </div>
</div>
<p class="d-hint">Наведите курсор на изображение</p>`,
  page: C => `<nav class="d-nav"><span class="d-logo">Studio</span><span class="d-menu"><a href="#">Проекты</a><a href="#">Услуги</a><a href="#">Контакты</a></span></nav>
<div class="d-page">
  <p class="d-k">Кастомный курсор</p>
  <h1 class="d-h">Наведите на кнопки и ссылки</h1>
  <div class="d-btns"><a class="d-btn" href="#">Обсудить проект</a><a class="d-btn ghost ${C}-hover" href="#">Смотреть кейсы</a></div>
</div>`,
  pages: (C, o) => o.page === 'b'
    ? `<nav class="d-nav"><span class="d-logo">Studio</span><span class="d-menu"><a href="#">Проекты</a><a href="#">Контакты</a></span></nav>
<div class="d-page">
  <p class="d-k">Страница 2 · О студии</p>
  <h1 class="d-h">Мы делаем сайты с характером</h1>
  <a class="d-go" href="#" data-awf-page="a">← Вернуться на главную</a>
</div>`
    : `<nav class="d-nav"><span class="d-logo">Studio</span><span class="d-menu"><a href="#">Проекты</a><a href="#">Контакты</a></span></nav>
<div class="d-page">
  <p class="d-k">Страница 1 · Главная</p>
  <h1 class="d-h">Нажмите на ссылку — сработает переход</h1>
  <a class="d-go" href="#" data-awf-page="b">Перейти в раздел «О студии» →</a>
</div>`,
  site: () => `<nav class="d-nav"><span class="d-logo">Studio</span><span class="d-menu"><a href="#">Проекты</a><a href="#">Услуги</a><a href="#">Контакты</a></span></nav>
<div class="d-page">
  <p class="d-k">Главная страница</p>
  <h1 class="d-h">Контент появляется после загрузки</h1>
  <div class="d-btns"><a class="d-btn" href="#">Начать проект</a></div>
</div>`,
  block: C => `<div class="d-block">
  <div class="${C}" style="position:absolute;inset:0"><div class="tn-atom" style="position:absolute;inset:0"></div></div>
  <div class="d-block-txt"><p class="d-k" style="color:#0c0c14">Фон первого экрана</p><p class="d-h">Фон, который дышит</p></div>
</div>`,
};

/* Собирает HTML-документ превью.
   o: { C, fonts: { css, fh, fb, fm }, page: 'a'|'b', pagesKey, origin }
   Страница не прокручивается: всё помещается в кадр, лишнее обрезается. */
export function buildDemo(fx, code, o) {
  const site = fx.scope === 'site';
  const markup = (DEMOS[fx.demo] || DEMOS.heading)(o.C, o);
  /* для перехода между страницами ссылки в демо получают адреса второй страницы превью */
  const linker = fx.demo === 'pages'
    ? `<script>(function(){var m=parent&&parent.__awfPages&&parent.__awfPages[${JSON.stringify(o.pagesKey)}];if(!m)return;[].forEach.call(document.querySelectorAll('[data-awf-page]'),function(a){a.href=m[a.getAttribute('data-awf-page')];});})();</script>`
    : '';
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${esc(o.origin)}/">
<title>AW-Flow — ${esc(fx.name)}</title>
<style>${o.fonts?.css || ''}
:root{--fh:${o.fonts?.fh || 'system-ui'};--fb:${o.fonts?.fb || 'system-ui'};--fm:${o.fonts?.fm || 'ui-monospace'}}
${BASE}</style>
${site ? code : ''}
</head>
<body>
${markup}
${linker}
${site ? '' : code}
</body>
</html>`;
}
