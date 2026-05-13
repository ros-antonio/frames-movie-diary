import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoginPage } from './useLoginPage';
import { useRegisterPage } from './useRegisterPage';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateSpy,
}));

describe('auth hooks backend paths', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
  });

  it('navigates on successful backend login and sets form error on failure', async () => {
    const login = vi
      .fn()
      // UPDATED: Now returns { user, token } to match the new API
      .mockResolvedValueOnce({
        user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'USER', permissions: ['MOVIE_READ_OWN'], mfaEnabled: false },
        token: 'fake-jwt-token'
      })
      .mockRejectedValueOnce(new Error('Login failed'));

    const { result } = renderHook(() => useLoginPage({ forceBackend: true, login }));

    await act(async () => {
      result.current.setEmail('  TONY@EXAMPLE.COM ');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent);
    });

    expect(login).toHaveBeenCalledWith({ email: 'tony@example.com', password: 'password123' });
    expect(navigateSpy).toHaveBeenCalledWith('/diary');
    navigateSpy.mockClear();

    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.errors.form).toBe('Login failed');
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates on successful backend register and sets form error on failure', async () => {
    const register = vi
      .fn()
      // UPDATED: Now returns { user, token } to match the new API
      .mockResolvedValueOnce({
        user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'USER', permissions: ['MOVIE_READ_OWN'], mfaEnabled: false },
        token: 'fake-jwt-token'
      })
      .mockRejectedValueOnce(new Error('Register failed'));

    const { result } = renderHook(() => useRegisterPage({ forceBackend: true, register }));

    await act(async () => {
      result.current.setName(' Tony Stark ');
      result.current.setEmail(' TONY@EXAMPLE.COM ');
      result.current.setPassword('password123');
      result.current.setConfirmPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister({ preventDefault() {} } as React.FormEvent);
    });

    expect(register).toHaveBeenCalledWith({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(navigateSpy).toHaveBeenCalledWith('/diary');
    navigateSpy.mockClear();

    await act(async () => {
      await result.current.handleRegister({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.errors.form).toBe('Register failed');
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('validates register required fields, invalid email, and max password length', async () => {
    const register = vi.fn();
    const { result } = renderHook(() => useRegisterPage({ forceBackend: true, register }));

    await act(async () => {
      result.current.setName('');
      result.current.setEmail('');
      result.current.setPassword('');
      result.current.setConfirmPassword('');
    });
    await act(async () => {
      await result.current.handleRegister({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.errors.password).toBe('Password is required');
    expect(result.current.errors.confirmPassword).toBe('Please confirm your password');
    expect(register).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();

    await act(async () => {
      result.current.setName('Valid Name');
      result.current.setEmail('invalid-email');
      result.current.setPassword('a'.repeat(129));
      result.current.setConfirmPassword('a'.repeat(129));
    });
    await act(async () => {
      await result.current.handleRegister({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.email).toBe('Please enter a valid email address');
    expect(result.current.errors.password).toBe('Password must be less than 128 characters');
    expect(register).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('switches to MFA verification when the backend requires a second step', async () => {
    const login = vi.fn().mockResolvedValue({
      challengeRequired: true,
      challengeToken: 'challenge-token',
      availableMethods: ['totp', 'recovery_code'],
      user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'ADMIN', permissions: ['SECURITY_MANAGE_ALL'], mfaEnabled: true },
    });
    const verify = vi.fn().mockResolvedValue({
      user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'ADMIN', permissions: ['SECURITY_MANAGE_ALL'], mfaEnabled: true },
      token: 'final-token',
    });

    const { result } = renderHook(() => useLoginPage({ forceBackend: true, login, verify }));

    await act(async () => {
      result.current.setEmail('admin@example.com');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.isMfaStep).toBe(true);
    expect(result.current.availableMethods).toEqual(['totp', 'recovery_code']);
    expect(navigateSpy).not.toHaveBeenCalled();

    await act(async () => {
      result.current.setMfaCode('123456');
    });

    await act(async () => {
      await result.current.handleMfaVerify({ preventDefault() {} } as React.FormEvent);
    });

    expect(verify).toHaveBeenCalledWith({
      challengeToken: 'challenge-token',
      code: '123456',
      method: 'totp',
    });
    expect(navigateSpy).toHaveBeenCalledWith('/diary');
  });

  it('surfaces MFA form errors for missing challenge, missing codes, and failed verification', async () => {
    const login = vi.fn().mockResolvedValue({
      challengeRequired: true,
      challengeToken: 'challenge-token',
      availableMethods: ['totp', 'recovery_code'],
      user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'ADMIN', permissions: ['SECURITY_MANAGE_ALL'], mfaEnabled: true },
    });
    const verify = vi.fn().mockRejectedValue(new Error('Invalid authenticator code'));

    const { result } = renderHook(() => useLoginPage({ forceBackend: true, login, verify }));

    await act(async () => {
      result.current.handleMfaVerify({ preventDefault() {} } as React.FormEvent);
    });
    expect(result.current.errors.form).toBe('MFA challenge is missing. Please sign in again.');

    await act(async () => {
      result.current.setEmail('admin@example.com');
      result.current.setPassword('password123');
    });
    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent);
    });

    await act(async () => {
      await result.current.handleMfaVerify({ preventDefault() {} } as React.FormEvent);
    });
    expect(result.current.errors.code).toBe('Authenticator code is required');

    await act(async () => {
      result.current.setMfaMethod('recovery_code');
    });
    await act(async () => {
      await result.current.handleMfaVerify({ preventDefault() {} } as React.FormEvent);
    });
    expect(result.current.errors.code).toBe('Recovery code is required');

    await act(async () => {
      result.current.setMfaCode('ABC123-DEF456');
    });
    await act(async () => {
      await result.current.handleMfaVerify({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.errors.form).toBe('Invalid authenticator code');
    });
  });

  it('resets the MFA stage back to the normal login form', async () => {
    const login = vi.fn().mockResolvedValue({
      challengeRequired: true,
      challengeToken: 'challenge-token',
      availableMethods: ['totp'],
      user: { id: 'u1', name: 'Tony', email: 'tony@example.com', role: 'ADMIN', permissions: ['SECURITY_MANAGE_ALL'], mfaEnabled: true },
    });

    const { result } = renderHook(() => useLoginPage({ forceBackend: true, login }));

    await act(async () => {
      result.current.setEmail('admin@example.com');
      result.current.setPassword('password123');
    });
    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.isMfaStep).toBe(true);

    act(() => {
      result.current.setMfaCode('123456');
    });

    act(() => {
      result.current.resetMfaStage();
    });

    expect(result.current.isMfaStep).toBe(false);
    expect(result.current.availableMethods).toEqual([]);
    expect(result.current.mfaCode).toBe('');
  });
});
