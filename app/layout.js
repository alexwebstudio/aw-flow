import './globals.css';
import { bodyFont, headingFont, logoFont, monoFont } from './fonts';
import SmoothScroll from '@/components/SmoothScroll';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import settings from '@/content/settings.json';

export const metadata = {
  metadataBase: new URL(settings.siteUrl),
  title: {
    default: 'AW-Flow — библиотека эффектов и анимаций для сайтов',
    template: '%s — AW-Flow',
  },
  description: 'AW-Flow — библиотека готовых визуальных эффектов и анимаций для сайтов на Tilda и на коде: появление, наведение, скролл, фон, текст и переходы с живым превью и настройкой параметров.',
  keywords: ['эффекты для сайта', 'анимации для Tilda', 'эффекты Tilda', 'анимация сайта', 'Zero Block анимация', 'GSAP эффекты', 'AW-Flow'],
  authors: [{ name: 'alexwebstudio', url: settings.studio.url }],
  openGraph: { type: 'website', locale: 'ru_RU', siteName: 'AW-Flow', url: '/' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AW-Flow',
  url: settings.siteUrl,
  inLanguage: 'ru-RU',
  publisher: { '@type': 'Organization', name: 'alexwebstudio', url: settings.studio.url },
};

export const viewport = { themeColor: '#ffffff', viewportFit: 'cover' };

/* до первой отрисовки: включаем режим анимаций */
const boot = `document.documentElement.classList.add('js')`;

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
      </body>
    </html>
  );
}
