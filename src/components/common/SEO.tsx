import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ─── Locales con OG image propia ────────────────────────────────────────────
// Agregá aquí cualquier locale que tenga su propio /public/og-image-{lang}.png
const OG_IMAGE_SUPPORTED_LOCALES = ['es', 'en', 'pt', 'zh'] as const;
type SupportedLocale = (typeof OG_IMAGE_SUPPORTED_LOCALES)[number];

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  OG_IMAGE_SUPPORTED_LOCALES.includes(locale as SupportedLocale);

/**
 * Devuelve la ruta relativa de la OG image según el locale.
 * Si el locale no tiene imagen propia, cae al inglés.
 */
const getLocaleOgImage = (locale: string): string => {
  const lang = isSupportedLocale(locale) ? locale : 'en';
  return `/og-image-${lang}.png`;
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface SEOProps {
  title: string;
  description: string;
  /** Imagen manual. Si se omite, se usa la OG image automática por locale. */
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  locale?: string;
  alternateLocales?: string[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noIndex?: boolean;
  twitterSite?: string;
  twitterCreator?: string;
  structuredData?: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SITE_NAME = 'Ethernal Fund';
const DEFAULT_AUTHOR = 'Ethernal.fund';
const DEFAULT_TWITTER = '@ethernal_fund';
const DEFAULT_ALTERNATE_LOCALES = ['en', 'fr', 'de', 'it', 'pt', 'zh'];

// ─── Component ───────────────────────────────────────────────────────────────
export const SEO = ({
  title,
  description,
  image,                                        // undefined → auto por locale
  imageWidth = 1200,
  imageHeight = 630,
  url,
  type = 'website',
  keywords = [],
  locale = 'es',
  alternateLocales = DEFAULT_ALTERNATE_LOCALES,
  publishedTime,
  modifiedTime,
  author = DEFAULT_AUTHOR,
  noIndex = false,
  twitterSite = DEFAULT_TWITTER,
  twitterCreator = DEFAULT_TWITTER,
  structuredData,
}: SEOProps) => {
  const location = useLocation();

  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://ethernal.fund';
  const currentUrl = url || `${baseUrl}${location.pathname}`;
  const fullTitle = `${title} | Ethernal | Eternal`;

  // OG image: manual > automática por locale > fallback inglés
  const resolvedImage = image ?? getLocaleOgImage(locale);
  const fullImageUrl = resolvedImage.startsWith('http')
    ? resolvedImage
    : `${baseUrl}${resolvedImage}`;

  useEffect(() => {
    const createdElements: Element[] = [];

    /** Crea o actualiza un <meta> tag. */
    const setMeta = (attr: 'name' | 'property', value: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${value}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, value);
        document.head.appendChild(tag);
        createdElements.push(tag);
      }
      tag.setAttribute('content', content);
    };

    // ── Title ────────────────────────────────────────────────────────────────
    const prevTitle = document.title;
    document.title = fullTitle;

    // ── Basic meta ───────────────────────────────────────────────────────────
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('name', 'author', author);

    if (keywords.length > 0) {
      setMeta('name', 'keywords', keywords.join(', '));
    }

    // ── Open Graph ───────────────────────────────────────────────────────────
    const ogTags: [string, string][] = [
      ['og:type',         type],
      ['og:url',          currentUrl],
      ['og:title',        fullTitle],
      ['og:description',  description],
      ['og:image',        fullImageUrl],
      ['og:image:width',  String(imageWidth)],
      ['og:image:height', String(imageHeight)],
      ['og:image:alt',    title],
      ['og:site_name',    SITE_NAME],
      ['og:locale',       locale],
    ];
    ogTags.forEach(([property, content]) => setMeta('property', property, content));

    // Recrear og:locale:alternate para evitar valores stale
    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach(el => el.remove());
    alternateLocales.forEach(altLocale => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:locale:alternate');
      tag.setAttribute('content', altLocale);
      document.head.appendChild(tag);
      createdElements.push(tag);
    });

    // ── Twitter Cards ────────────────────────────────────────────────────────
    const twitterTags: [string, string][] = [
      ['twitter:card',        'summary_large_image'],
      ['twitter:url',         currentUrl],
      ['twitter:title',       fullTitle],
      ['twitter:description', description],
      ['twitter:image',       fullImageUrl],
      ['twitter:image:alt',   title],
      ['twitter:site',        twitterSite],
      ['twitter:creator',     twitterCreator],
    ];
    twitterTags.forEach(([name, content]) => setMeta('name', name, content));

    // ── Article tags (solo si type === 'article') ────────────────────────────
    if (type === 'article') {
      if (publishedTime) setMeta('property', 'article:published_time', publishedTime);
      if (modifiedTime)  setMeta('property', 'article:modified_time',  modifiedTime);
      setMeta('property', 'article:author', author);
    }

    // ── hreflang links ───────────────────────────────────────────────────────
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', baseUrl);
    document.head.appendChild(xDefault);
    createdElements.push(xDefault);

    alternateLocales.forEach(altLocale => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', altLocale);
      link.setAttribute('href', `${baseUrl}/${altLocale}${location.pathname}`);
      document.head.appendChild(link);
      createdElements.push(link);
    });

    // ── Canonical ────────────────────────────────────────────────────────────
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
      createdElements.push(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // ── JSON-LD Structured Data ──────────────────────────────────────────────
    const defaultStructuredData =
      type === 'article'
        ? {
            '@context':    'https://schema.org',
            '@type':       'Article',
            headline:      title,
            description,
            image:         fullImageUrl,
            url:           currentUrl,
            author:        { '@type': 'Person', name: author },
            publisher: {
              '@type': 'Organization',
              name:    SITE_NAME,
              logo:    { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
            },
            ...(publishedTime && { datePublished: publishedTime }),
            ...(modifiedTime  && { dateModified:  modifiedTime }),
          }
        : {
            '@context': 'https://schema.org',
            '@type':    'WebSite',
            name:       SITE_NAME,
            url:        baseUrl,
            description,
            image:      fullImageUrl,
          };

    let jsonLd = document.querySelector('script[data-seo="json-ld"]');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.setAttribute('type', 'application/ld+json');
      jsonLd.setAttribute('data-seo', 'json-ld');
      document.head.appendChild(jsonLd);
      createdElements.push(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData ?? defaultStructuredData);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      document.title = prevTitle;
      createdElements.forEach(el => el.parentNode?.removeChild(el));
    };
  }, [
    fullTitle,
    description,
    fullImageUrl,
    imageWidth,
    imageHeight,
    currentUrl,
    type,
    keywords,
    locale,
    alternateLocales,
    publishedTime,
    modifiedTime,
    author,
    noIndex,
    twitterSite,
    twitterCreator,
    structuredData,
    baseUrl,
    location.pathname,
  ]);

  return null;
};

export default SEO;