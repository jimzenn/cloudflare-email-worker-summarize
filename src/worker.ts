import PostalMime from 'postal-mime';

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
  EMAIL_ALLOWLIST: string;
}

interface EmailValidationResult {
  allowed: boolean;
  normalizedSender: string;
  originalSender: string;
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
const EMAIL_NORMALIZATION_REGEX = /(\+[^@]+)?@/;
const ALLOWLIST_SEPARATOR = ',';

// ======================
// Utility Functions
// ======================
function normalizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(EMAIL_NORMALIZATION_REGEX, '@') // Remove + suffixes
    .trim();
}

function compileAllowlistPatterns(allowlist: string): RegExp[] {
  return allowlist.split(ALLOWLIST_SEPARATOR)
    .filter(pattern => pattern.trim().length > 0)
    .map(pattern => {
      const escaped = pattern
        .trim()
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\\\*/g, '.*'); // Convert wildcards to regex

      return new RegExp(`^${escaped}$`);
    });
}

function isEmailAllowed(sender: string, allowlistPatterns: RegExp[]): EmailValidationResult {
  const normalized = normalizeEmail(sender);
  const original = sender.toLowerCase().trim();

  const allowed = allowlistPatterns.some(pattern =>
    pattern.test(normalized) || pattern.test(original)
  );

  return { allowed, normalizedSender: normalized, originalSender: original };
}

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


async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
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

// ======================
// Main Worker Handler
// ======================

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      // Parse email first to get sender information
      const email = await PostalMime.parse(message.raw);
      const sender = email.from.address || 'unknown';

      // Configure allowlist patterns
      const allowlistPatterns = compileAllowlistPatterns(
        env.EMAIL_ALLOWLIST
      );

      // Validate sender against allowlist
      const validation = isEmailAllowed(sender, allowlistPatterns);
      if (!validation.allowed) {
        console.log(`Blocked email from: ${validation.originalSender}, Subject: "${email.subject}"`);
        return; // Exit without processing
      }

      // Proceed with processing
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