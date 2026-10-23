import './globals.css';
import { bodyFont, headingFont, logoFont, monoFont } from './fonts';
import SmoothScroll from '@/components/SmoothScroll';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import YandexMetrika from '@/components/YandexMetrika';
import settings from '@/content/settings.json';

export const metadata = {
  metadataBase: new URL(settings.siteUrl),
  title: {
    default: 'Разработка сайтов в Казахстане и России — alexwebstudio',
    template: '%s — alexwebstudio',
  },
  description: 'Разработка сайтов под ключ в Казахстане (Караганда) и России: лендинги, многостраничные и корпоративные сайты, интернет-магазины, сайты-визитки. На коде или на Tilda — с дизайном и SEO.',
  keywords: ['разработка сайтов', 'разработка сайтов Казахстан', 'разработка сайтов Караганда', 'создание сайтов под ключ', 'заказать сайт Казахстан', 'веб-студия Казахстан', 'заказать лендинг', 'интернет-магазин', 'корпоративный сайт', 'сайт-визитка', 'Казахстан', 'Караганда', 'Россия'],
  authors: [{ name: 'AlexWebStudio' }],
  openGraph: {
    type: 'website', locale: 'ru_RU', siteName: 'AlexWebStudio', url: '/',
    images: [{ url: '/images/preview.jpg', width: 1200, height: 1200, alt: 'AlexWebStudio — разработка сайтов' }],
  },
  twitter: { card: 'summary_large_image', images: ['/images/preview.jpg'] },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  verification: { google: 'qtXbQVBaCC6v8RDU9ZV0k3fUgVZHvfCc2bzX7riVO_w' },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AlexWebStudio',
  url: settings.siteUrl,
  inLanguage: 'ru-RU',
};

export const viewport = { themeColor: '#050507', viewportFit: 'cover' };

/* до первой отрисовки: включаем режим анимаций и пропускаем прелоадер,
   если он уже был показан в этой сессии */
const boot = `(function(d){d.classList.add('js');try{if(sessionStorage.getItem('aws-seen')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('no-preload')}catch(e){}})(document.documentElement)`;

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${logoFont.variable} ${bodyFont.variable} ${monoFont.variable} ${headingFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd).replace(/</g, '\\u003c') }} />
      </head>
      <body>
        <div className="glow-bg" aria-hidden="true" />
        <div className="prog" aria-hidden="true" />
        <SmoothScroll />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <YandexMetrika />
        <noscript><div><img src="https://mc.yandex.ru/watch/113426490" style={{ position: 'absolute', left: '-9999px' }} alt="" /></div></noscript>
      </body>
    </html>
  );
}
