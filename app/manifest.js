export default function manifest() {
  return {
    name: 'AlexWebStudio',
    short_name: 'alexwebstudio',
    description: 'Веб-студия: сайты для бизнеса в России и Казахстане.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050507',
    theme_color: '#050507',
    lang: 'ru',
    icons: [
      { src: '/icons/favicon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icons/favicon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
}
