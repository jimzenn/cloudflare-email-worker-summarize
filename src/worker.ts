import PostalMime from 'postal-mime';
import urlRegexSafe from 'url-regex-safe';

// ======================
// Type Definitions
// ======================

interface Env {
  PUSHOVER_API_KEY: string;
  PUSHOVER_USER_KEY: string;
  PUSHOVER_API_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_TO_CHAT_ID: string;
  SHORTIO_API_KEY: string;
  SHORTIO_DOMAIN: string;
}

interface ShortenResponse {
  shortURL?: string;
  secureShortURL?: string;
}


// ======================
// Constants
// ======================
const SHORTIO_API_URL = 'https://api.short.io/links';
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const SLUG_HASH_LENGTH = 4;
const MIN_URL_LENGTH_FOR_SHORTENING = 50;

// ======================
// Utility Functions
// ======================

const createHttpClient = (baseOptions: RequestInit = {}) => async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, { ...baseOptions, ...options });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP Error: ${response.status} - ${errorBody}`);
  }

  return response.json() as Promise<T>;
};

// ======================
// Core Functionality
// ======================

async function sendPushoverNotification(title: string, message: string, env: Env): Promise<void> {
  const formData = new URLSearchParams({
    token: env.PUSHOVER_API_KEY,
    user: env.PUSHOVER_USER_KEY,
    title,
    message,
  });

  await fetch(env.PUSHOVER_API_URL, {
    method: 'POST',
    body: formData,
  });
}

async function sendTelegramMessage(text: string, env: Env): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const shortenedText = text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);

  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_TO_CHAT_ID,
      text: shortenedText,
    }),
  });
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

async function shortenUrl(url: string, env: Env): Promise<string> {
  if (url.length < MIN_URL_LENGTH_FOR_SHORTENING) return url;

  try {
    const slug = generateSlug(url);
    const http = createHttpClient({
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': env.SHORTIO_API_KEY
      }
    });

    const data = await http<ShortenResponse>(SHORTIO_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        domain: env.SHORTIO_DOMAIN,
        originalURL: url,
        path: slug,
        allowDuplicates: false
      })
    });

    return data.shortURL || data.secureShortURL || url;
  } catch (error) {
    console.error('URL shortening failed:', error);
    return url;
  }
}

function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
  const urls = text.match(urlRegexSafe({ strict: true, localhost: false })) || [];
  let processedText = text;

  for (const url of urls) {
    const shortUrl = await shortenUrl(url, env);
    processedText = processedText.split(url).join(shortUrl);
  }

  return processedText;
}

// ======================
// Main Worker Handler
// ======================

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const email = await PostalMime.parse(message.raw);
      const cleanText = removeRepeatedEmptyLines(email.text || '');
      const processedText = await replaceWithShortenedUrls(cleanText, env);

      await Promise.all([
        sendPushoverNotification(email.subject, processedText, env),
        sendTelegramMessage(processedText, env),
      ]);
    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};