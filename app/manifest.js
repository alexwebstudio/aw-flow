export default function manifest() {
  return {
    name: 'AW-Flow',
    short_name: 'AW-Flow',
    description: 'Библиотека готовых эффектов и анимаций для сайтов на Tilda и на коде.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'ru',
    icons: [{ src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' }],
  };
}
