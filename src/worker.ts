import PostalMime from 'postal-mime';

interface Env {
  PUSHOVER_API_KEY: string;
  PUSHOVER_USER_KEY: string;
  PUSHOVER_API_URL: string;
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

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const email = await PostalMime.parse(message.raw);

    await sendPushoverNotification(email.subject, email.text, env);
  },
};

