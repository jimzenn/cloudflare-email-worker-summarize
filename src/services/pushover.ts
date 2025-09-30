import { Env } from '@/types/env';

export class PushoverError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PushoverError';
  }
}

export async function sendPushoverNotification(title: string, message: string, env: Env): Promise<void> {
  console.log(`[Pushover] Sending notification: "${title}"`);
  try {
    const formData = new URLSearchParams({
      token: env.PUSHOVER_API_KEY,
      user: env.PUSHOVER_USER_KEY,
      title,
      message,
    });

    const response = await fetch(env.PUSHOVER_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new PushoverError(`Failed to send notification: ${response.statusText}`, errorBody);
    }
    console.log(`[Pushover] Successfully sent notification: "${title}"`);
  } catch (error) {
    if (error instanceof PushoverError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[Pushover] Error sending notification: "${title}"`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new PushoverError(`Error sending notification: ${errorMessage}`, error);
  }
}
  