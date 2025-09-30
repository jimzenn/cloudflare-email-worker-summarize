import { Env } from '@/types/env';

export class LinkUtilError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LinkUtilError';
  }
}

const SHORTIO_API_URL = 'https://api.short.io/links';
const SLUG_HASH_LENGTH = 4;
const MIN_URL_LENGTH_TO_RESOLVE = 80;
const MAX_URL_SHORTENS = 10;
const URL_PLACEHOLDER = 'URL';

interface ShortenResponse {
  shortURL?: string;
  secureShortURL?: string;
}

function generateSlug(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const domainParts = hostname.split('.').slice(-2);
    const domain = domainParts.join('.').replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '');

    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const hashString = Math.abs(hash).toString(36).toLowerCase();
    const finalHash = hashString.slice(-SLUG_HASH_LENGTH);

    return `${domain}_${finalHash}`;
  } catch (error) {
    throw new LinkUtilError(`Invalid URL for slug generation: ${url}`, error);
  }
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(?:[^\s/?#<>\[\]]+\.)+[^\s/?#<>\[\]]+(?:\/[^\s?#<>\[\]]*)*(?:\?[^\s#<>\[\]]*)?(?:#[^\s<>\[\]]*)?/gi;
  return (text.match(urlRegex) || []).filter(url => {
    try {
      const parsed = new URL(url);
      return !parsed.hostname.includes('localhost');
    } catch {
      return false;
    }
  });
}

export async function shortenUrl(url: string, env: Env): Promise<string> {
  console.log('[Link] Shortening', url);
  try {
    const slug = generateSlug(url);
    const response = await fetch(SHORTIO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': env.SHORTIO_API_KEY,
      },
      body: JSON.stringify({
        domain: env.SHORTIO_DOMAIN,
        originalURL: url,
        path: slug,
        allowDuplicates: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      throw new LinkUtilError(`Failed to shorten URL: ${response.statusText}`, errorBody);
    }

    const data: ShortenResponse = await response.json();
    return data.secureShortURL || data.shortURL || url;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[Link] URL shortening failed for ${url}: ${message}`, error);
    return url;
  }
}

async function resolveUrlToFinal(url: string): Promise<string> {
  console.log(`[Link] Resolving URL: ${url}`);
  try {
    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 5;
    const visitedUrls = new Set<string>();

    while (redirectCount < maxRedirects) {
      if (visitedUrls.has(currentUrl)) {
        console.warn(`[Link] Detected redirect loop for ${url}`);
        return currentUrl;
      }
      visitedUrls.add(currentUrl);

      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; URL-resolver/1.0)',
          'Accept': '*/*',
        },
      });

      const nextUrl =
        response.headers.get('location') ||
        response.headers.get('content-location') ||
        response.headers.get('refresh')?.split(/url=(.+)/i)[1]?.trim();

      if (!nextUrl || (response.status >= 200 && response.status < 300)) {
        console.log(`[Link] Resolved ${url} to: ${currentUrl}`);
        return currentUrl;
      }

      currentUrl = new URL(nextUrl, currentUrl).toString();
      redirectCount++;
    }

    console.warn(`[Link] Max redirects (${maxRedirects}) reached for ${url}`);
    return currentUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[Link] Failed to resolve URL ${url}: ${message}`, error);
    return url;
  }
}

export async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
  if (!env.ENABLE_LINK_SHORTENING) {
    return text;
  }

  const urls = [...new Set(extractUrls(text))];
  const longUrls = urls.filter(url => url.length > MIN_URL_LENGTH_TO_RESOLVE);

  if (longUrls.length === 0) {
    return text;
  }

  if (longUrls.length > MAX_URL_SHORTENS) {
    console.warn(`[Link] Too many URLs (${longUrls.length}) to shorten, replacing with placeholder`);
    let modifiedText = text;
    for (const url of longUrls) {
      modifiedText = modifiedText.split(url).join(URL_PLACEHOLDER);
    }
    return modifiedText;
  }

  const urlMap = new Map<string, string>();
  await Promise.all(
    longUrls.map(async originalUrl => {
      const finalUrl = await resolveUrlToFinal(originalUrl);
      const shortUrl = await shortenUrl(finalUrl, env);
      if (shortUrl !== finalUrl) {
        urlMap.set(originalUrl, shortUrl);
      }
    })
  );

  if (urlMap.size === 0) {
    return text;
  }

  let modifiedText = text;
  for (const [originalUrl, shortUrl] of urlMap.entries()) {
    modifiedText = modifiedText.split(originalUrl).join(shortUrl);
  }

  return modifiedText;
}