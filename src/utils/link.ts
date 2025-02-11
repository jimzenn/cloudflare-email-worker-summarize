import { Env } from 'types/env';
const SHORTIO_API_URL = 'https://api.short.io/links';
const SLUG_HASH_LENGTH = 4;
const MIN_URL_LENGTH_FOR_SHORTENING = 50;


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

        const hash = Array.from({ length: SLUG_HASH_LENGTH }, () =>
            'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
        ).join('');

        return `${domain}_${hash}`;
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
    if (url.length < MIN_URL_LENGTH_FOR_SHORTENING) return url;

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


export async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
  const urls = extractUrls(text);
  let processedText = text;

  for (const url of urls) {
    const shortUrl = await shortenUrl(url, env);
    console.log(`Replacing ${url} with ${shortUrl}`);
    processedText = processedText.split('<' + url + '>').join(shortUrl);
    processedText = processedText.split(url).join(shortUrl);
  }

  return processedText;
}

