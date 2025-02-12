import * as jose from 'jose';

export async function generateJWT(serviceAccount: any): Promise<string> {
    const privateKey = await jose.importPKCS8(
      serviceAccount.private_key,
      'RS256'
    );
  
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
  
    return jwt;
  }
  