import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const CAPTCHA_SECRET = process.env.JWT_SECRET || 'captcha-secret';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
  const r = randomInt(40, 200);
  const g = randomInt(40, 200);
  const b = randomInt(40, 200);
  return `rgb(${r},${g},${b})`;
}

function generateCaptchaSvg(text: string, width = 120, height = 44): string {
  const textLen = text.length;
  const fontSize = 28;
  const spacing = (width - 10) / (textLen + 1);

  let chars = '';
  for (let i = 0; i < textLen; i++) {
    const x = spacing * (i + 1);
    const y = height / 2 + fontSize / 3;
    const angle = (Math.random() - 0.5) * 0.4;
    const color = randomColor();
    chars += `<text x="${x}" y="${y}" transform="rotate(${angle},${x},${y})" font-size="${fontSize}" font-family="Arial,sans-serif" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${text[i]}</text>`;
  }

  let noise = '';
  for (let i = 0; i < 3; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randomColor()}" stroke-width="1" opacity="0.5"/>`;
  }

  for (let i = 0; i < 20; i++) {
    const x = randomInt(0, width);
    const y = randomInt(0, height);
    noise += `<circle cx="${x}" cy="${y}" r="1" fill="${randomColor()}" opacity="0.4"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#f0fdf4;border-radius:8px">
    ${noise}
    ${chars}
  </svg>`;
}

export async function GET() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let text = '';
  for (let i = 0; i < 4; i++) {
    text += chars[randomInt(0, chars.length - 1)];
  }

  const svg = generateCaptchaSvg(text);
  const token = jwt.sign({ text: text.toLowerCase(), exp: Math.floor(Date.now() / 1000) + 300 }, CAPTCHA_SECRET);

  const response = NextResponse.json({ svg });
  response.cookies.set('captcha_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  return response;
}
