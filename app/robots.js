import settings from '@/content/settings.json';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${settings.siteUrl}/sitemap.xml`,
  };
}
