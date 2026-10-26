import settings from '@/content/settings.json';

/* Хлебные крошки в формате schema.org (BreadcrumbList) для rich-результатов.
   items: [{ name, path }] — path без домена. */
export function breadcrumbsLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: settings.siteUrl + it.path,
    })),
  };
}

export function jsonLdScript(obj) {
  return { __html: JSON.stringify(obj).replace(/</g, '\\u003c') };
}

/* Open Graph для конкретной страницы: общие поля сайта + per-page og:url
   (относительный путь резолвится по metadataBase). */
export function og(path) {
  return { type: 'website', locale: 'ru_RU', siteName: 'AW-Flow', url: path };
}
