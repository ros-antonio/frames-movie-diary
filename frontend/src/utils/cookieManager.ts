export interface CookieOptions {
  maxAge?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

const COOKIE_DEFAULTS = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: '/',
  sameSite: 'Lax' as const,
};

export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const cookieOptions = { ...COOKIE_DEFAULTS, ...options };
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (cookieOptions.maxAge) {
    cookieString += `; Max-Age=${cookieOptions.maxAge}`;
  }
  if (cookieOptions.path) {
    cookieString += `; Path=${cookieOptions.path}`;
  }
  if (cookieOptions.sameSite) {
    cookieString += `; SameSite=${cookieOptions.sameSite}`;
  }
  if (cookieOptions.secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

export function getCookie(name: string): string | null {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

export function deleteCookie(name: string) {
  setCookie(name, '', { maxAge: 0 });
}

