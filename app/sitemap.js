import { getProducts, getProjects, getServices, getSettings } from '@/lib/content';

export default function sitemap() {
  const base = getSettings().siteUrl;
  const pages = ['', '/services', '/portfolio', '/about', '/reviews', '/join', '/brief'].map(p => ({
    url: base + p, changeFrequency: 'monthly', priority: p === '' ? 1 : 0.8,
  }));
  const legal = [{ url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 }];
  const services = getServices().map(s => ({ url: `${base}/services/${s.slug}`, changeFrequency: 'monthly', priority: 0.7 }));
  const products = getProducts().map(p => ({ url: `${base}/products/${p.slug}`, changeFrequency: 'monthly', priority: 0.7 }));
  const projects = getProjects().map(p => ({ url: `${base}/portfolio/${p.slug}`, changeFrequency: 'yearly', priority: 0.6 }));
  return [...pages, ...services, ...products, ...projects, ...legal];
}
