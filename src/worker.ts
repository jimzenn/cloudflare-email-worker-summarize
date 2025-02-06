import PostalMime from 'postal-mime';

interface Env {
  PUSHOVER_API_KEY: string;
  PUSHOVER_USER_KEY: string;
  PUSHOVER_API_URL: string;
  TELEGRAM_BOT_TOKEN: string;
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

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const email = await PostalMime.parse(message.raw);
    const chatId = 151667449;

    await sendPushoverNotification(email.subject, email.text, env);
    await sendTelegramMessage(chatId, email.text, env);
  },
};

