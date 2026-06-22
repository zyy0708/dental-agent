import jwt from 'jsonwebtoken';

const CAPTCHA_SECRET = process.env.JWT_SECRET || 'captcha-secret';

export async function verifyCaptcha(answer: string, cookie: string | undefined): Promise<boolean> {
  if (!answer || !cookie) return false;
  try {
    const payload = jwt.verify(cookie, CAPTCHA_SECRET) as { text: string };
    return payload.text === answer.toLowerCase().replace(/\s/g, '');
  } catch {
    return false;
  }
}
