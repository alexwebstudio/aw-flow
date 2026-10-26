import settings from '@/content/settings.json';
import { getEffects } from '@/lib/aw-flow';

export default function sitemap() {
  const base = settings.siteUrl;
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    ...getEffects().map(fx => ({ url: `${base}/effects/${fx.slug}`, changeFrequency: 'monthly', priority: 0.8 })),
  ];
}
