import PostalMime from 'postal-mime';
import urlRegexSafe from 'url-regex-safe';

interface Env {
    PUSHOVER_API_KEY: string;
    PUSHOVER_USER_KEY: string;
    PUSHOVER_API_URL: string;
    TELEGRAM_BOT_TOKEN: string;
    SHORTIO_API_KEY: string;
}


async function sendPushoverNotification(title: string, message: string, env: Env): Promise<void> {
    const response = await fetch(env.PUSHOVER_API_URL, {
        method: 'POST',
        body: new URLSearchParams({
            token: env.PUSHOVER_API_KEY,
            user: env.PUSHOVER_USER_KEY,
            title: title,
            message: message,
        }),
    });

    if (!response.ok) {
        console.error('Error sending notification:', response.status, await response.text());
    }
}


async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    env: Env,
): Promise<void> {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4096),
        }),
    });

    if (!response.ok) {
        console.error('Error sending notification:', response.status, await response.text());
    }
}

function generateSlug(url: string): string {
    // Parse the URL to get the hostname
    const hostname = new URL(url).hostname;

    // Remove subdomain and get the main domain
    const domain = hostname.split('.').slice(-2).join('.')
        .replace(/\./g, '-') // Replace dots with dashes
        .replace(/[^a-z0-9-]/g, ''); // Remove any special characters

    // Generate a random 4-character alphanumeric hash
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const hash = Array.from(
        { length: 4 },
        () => characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    return `${domain}_${hash}`;
}
async function shortenUrl(url: string, env: Env): Promise<string> {
    if (url.length < 50) {
        return url;
    }
    try {
        const slug = generateSlug(url);
        const response = await fetch('https://api.short.io/links', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': env.SHORTIO_API_KEY
            },
            body: JSON.stringify({
                domain: 'link.zenn.in',
                originalURL: url,
                path: slug,
                allowDuplicates: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Short.io API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data.shortURL || data.secureShortURL || url;
    } catch (error) {
        console.error('Error shortening URL:', { url, error });
        return url;
    }
}

function removeRepeatedEmptyLines(text: string): string {
    return text.replace(/([^\S\n]*\n){3,}/g, '\n\n');
}

async function replaceWithShortenedUrls(text: string, env: Env): Promise<string> {
    // Find all URLs in the text using stricter regex options
    const urls = text.match(urlRegexSafe({ strict: true, localhost: false })) || [];

    // Debug logs
    console.log('Input text:', text);
    console.log('URLs found:', urls.length);
    console.log('Found URLs:', urls.length === 0 ? '[]' : JSON.stringify(urls));
    console.log('URL lengths:', urls.length === 0 ? '[]' : JSON.stringify(urls.map(url => ({ url, length: url.length }))));

    let processedText = text;

    // Process each URL sequentially to maintain order
    for (const url of urls) {
        const shortUrl = await shortenUrl(url, env);
        processedText = processedText.replace(url, shortUrl);
    }

    return processedText;
}

export default {
    async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
        const email = await PostalMime.parse(message.raw);
        const chatId = 151667449;
        const processedText = await replaceWithShortenedUrls(removeRepeatedEmptyLines(email.text), env);

        const pushoverPromise = sendPushoverNotification(email.subject, processedText, env);
        const telegramPromise = sendTelegramMessage(chatId, processedText, env);

        await Promise.all([pushoverPromise, telegramPromise]);
    },
};

