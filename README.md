# AW-Flow

Сайт-витрина библиотеки готовых визуальных эффектов и анимаций для сайтов (Tilda и код).
Продукт студии alexwebstudio. Сейчас это визуальная концепция: без авторизации, оплаты,
бэкенда и реального экспорта кода.

## Стек
Next.js 16 (App Router, JavaScript), React 19, GSAP 3 + ScrollTrigger, Lenis.

## Запуск
```bash
npm install
npm run dev     # http://localhost:3000 (в .claude/launch.json — порт 3100)
npm run build
```

## Структура
- `app/page.js` — главная: hero с живым демо, «как это работает», каталог, CTA.
- `app/effects/[slug]/page.js` — страница эффекта: превью, панель параметров, блок «как добавить».
- `content/aw-flow.json` — каталог эффектов: категории, триггеры, параметры и их диапазоны.
- `content/settings.json` — адрес сайта, ссылка на студию, контакты.
- `components/FxPreview.js` — движок живых превью (12 сцен), `FxControls.js` — панель параметров,
  `FxStudio.js` — превью + панель + код, `AwFlowCatalog.js` / `FxCard.js` — каталог.
- `app/globals.css` — дизайн-система (светлая тема, фиолетовый акцент).

## Добавить эффект
1. Запись в `content/aw-flow.json` (`slug`, `name`, `category`, `trigger`, `short`, `params`).
2. Сцена в `components/FxPreview.js` + ключ в `SCENES`, стили сцены в `globals.css`.
