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
      .mockResolvedValueOnce({ id: 'u1', name: 'Tony', email: 'tony@example.com' })
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
      .mockResolvedValueOnce({ id: 'u1', name: 'Tony', email: 'tony@example.com' })
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
});

