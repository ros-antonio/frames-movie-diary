import { describe, expect, it } from 'vitest';
import { deleteCookie, getCookie, setCookie } from './cookieManager';

describe('cookieManager', () => {
  it('sets and reads cookies with defaults', () => {
    setCookie('frames_test_cookie', 'hello world');

    expect(getCookie('frames_test_cookie')).toBe('hello world');
  });

  it('supports secure option and deleteCookie helper', () => {
    setCookie('frames_secure_cookie', 'secret', {
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 60,
    });

    expect(getCookie('frames_secure_cookie')).toBe('secret');

    deleteCookie('frames_secure_cookie');
    expect(getCookie('frames_secure_cookie')).toBe('');
  });
});

