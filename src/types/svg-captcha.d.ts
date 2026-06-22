declare module 'svg-captcha' {
  interface CaptchaOptions {
    size?: number;
    ignoreChars?: string;
    noise?: number;
    color?: boolean;
    background?: string;
    width?: number;
    height?: number;
  }
  interface CaptchaResult {
    text: string;
    data: string;
  }
  export function create(options?: CaptchaOptions): CaptchaResult;
  export function createMathExpr(options?: CaptchaOptions): CaptchaResult;
}
