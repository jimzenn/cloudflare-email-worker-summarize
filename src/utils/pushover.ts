import { Env } from 'types/env';

export async function sendPushoverNotification(title: string, message: string, env: Env): Promise<void> {
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
  
  