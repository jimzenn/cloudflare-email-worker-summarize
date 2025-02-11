import { Env } from 'types/env';

const SHORTIO_API_URL = 'https://api.short.io/links';
const SLUG_HASH_LENGTH = 4;
const MIN_URL_LENGTH_FOR_SHORTENING = 80;
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
    const domain = domainParts.join('.')
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/gi, '');

    // Create a deterministic hash based on the full URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert the hash to a base36 string and take last SLUG_HASH_LENGTH characters
    const hashString = Math.abs(hash).toString(36).toLowerCase();
    const finalHash = hashString.slice(-SLUG_HASH_LENGTH);

    return `${domain}_${finalHash}`;
  } catch (error) {
    throw new Error(`Invalid URL for slug generation: ${url}`);
  }
}

function extractUrls(text: string): string[] {
  // Custom regex that excludes <, >, [, and ] from all URL components
  const urlRegex = /https?:\/\/(?:[^\s/?#<>\[\]]+\.)+[^\s/?#<>\[\]]+(?:\/[^\s?#<>\[\]]*)*(?:\?[^\s#<>\[\]]*)?(?:#[^\s<>\[\]]*)?/gi;

  // Match URLs and filter out localhost
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
  console.log('shortening', url);
  try {
    const slug = generateSlug(url);
    const response = await fetch(SHORTIO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': env.SHORTIO_API_KEY
      },
      body: JSON.stringify({
        domain: env.SHORTIO_DOMAIN,
        originalURL: url,
        path: slug,
        allowDuplicates: false
      })
    });

    const data: ShortenResponse = await response.json();
    return data.shortURL || data.secureShortURL || url;
  } catch (error) {
    console.error('URL shortening failed:', error);
    return url;
  }
}

async function resolveUrlToFinal(url: string): Promise<string> {
  try {
    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 5; // Safe maximum to prevent infinite loops
    const visitedUrls = new Set<string>();

    while (redirectCount < maxRedirects) {
      // Check for redirect loops
      if (visitedUrls.has(currentUrl)) {
        console.warn(`Detected redirect loop for ${url}`);
        return currentUrl;
      }
      visitedUrls.add(currentUrl);

      const response = await fetch(currentUrl, {
        method: 'HEAD', // Faster than GET for redirect checking
        redirect: 'manual', // We'll handle redirects ourselves
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; URL-resolver/1.0)',
          'Accept': '*/*'
        }
      });

      // Check various redirect methods
      const nextUrl = response.headers.get('location') ||
        response.headers.get('content-location') ||
        response.headers.get('refresh')?.split(/url=(.+)/i)[1]?.trim();

      if (!nextUrl || (response.status >= 200 && response.status < 300)) {
        // No more redirects or successful response
        console.log('resolved: ', currentUrl);
        return currentUrl;
      }

      // Resolve relative URLs
      currentUrl = new URL(nextUrl, currentUrl).toString();
      redirectCount++;
    }

    console.warn(`Max redirects (${maxRedirects}) reached for ${url}`);
    return currentUrl;
  } catch (error) {
    console.error(`Failed to resolve URL ${url}:`, error);
    return url;
  }
}

export async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
  const urls = extractUrls(text);
  const finalUrls = new Set<string>();

  // Resolve all URLs to their final form
  await Promise.all(urls.map(async (url) => {
    const finalUrl = await resolveUrlToFinal(url);
    finalUrls.add(finalUrl);
  }));

  const longUrls = [...finalUrls].filter(url => url.length > MIN_URL_LENGTH_FOR_SHORTENING);

  if (longUrls.length > MAX_URL_SHORTENS) {
    console.warn(`Too many URLs (${longUrls.length}) to shorten, skipping`);
    return text;
  }

  const shortUrls = await Promise.all(longUrls.map(async (url) => {
    return await shortenUrl(url, env);
  }));

  const urlMap = new Map<string, string>();
  for (let i = 0; i < longUrls.length; i++) {
    urlMap.set(longUrls[i], shortUrls[i]);
  }

  return urls.reduce(
    (text, url) => text.split(url).join(urlMap.get(url)!),
    text
  );
}
