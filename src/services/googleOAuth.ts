import * as jose from 'jose';

export class GoogleAuthError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  try {
    console.log('[GoogleAuth] Creating JWT...');
    const privateKey = await jose.importPKCS8(serviceAccount.private_key, 'RS256');
    const now = Math.floor(Date.now() / 1000);

    const jwt = await new jose.SignJWT({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(privateKey);

    console.log('[GoogleAuth] Exchanging JWT for access token...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new GoogleAuthError(`Failed to get access token: ${response.statusText}`, data);
    }

    console.log('[GoogleAuth] Successfully obtained access token.');
    return data.access_token;
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[GoogleAuth] Error getting access token: ${message}`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new GoogleAuthError(`Error getting access token: ${message}`, error);
  }
}
  