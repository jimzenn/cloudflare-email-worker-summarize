interface Env {
  PUSHOVER_API_KEY: string;
  PUSHOVER_USER_KEY: string;
  PUSHOVER_API_URL: string;
}

async function sendPushoverNotification(email: ForwardableEmailMessage, env: Env): Promise<void> {
  const title = email.headers.get('subject')?.trim() || 'No Subject';
  const content = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Subject: ${title}`,
  ].join('\n');

  const params = new URLSearchParams({
    token: env.PUSHOVER_API_KEY,
    user: env.PUSHOVER_USER_KEY,
    title,
    message: content,
  });

  console.log('Forwarding email to Pushover with params:', params.toString());

  const response = await fetch(env.PUSHOVER_API_URL, {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    console.error('Error sending notification:', response.status, await response.text());
  }
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Received email:', message);
    await sendPushoverNotification(message, env);
  },
};

