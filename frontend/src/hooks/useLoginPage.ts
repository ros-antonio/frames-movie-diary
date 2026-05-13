import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, verifyMfa } from '../api/movieDiaryApi';
import { EMAIL_REGEX, normalizeEmail } from '../utils/formValidation';
import { dispatchSessionChanged, persistSessionUser, persistTestSessionUser } from '../utils/session';
import type { LoginResult } from '../types';

interface FormErrors {
  email?: string;
  password?: string;
  code?: string;
  form?: string;
}

function validateLoginForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  const trimmedEmail = normalizeEmail(email);
  if (!trimmedEmail) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address';
  } else if (trimmedEmail.length > 255) {
    errors.email = 'Email must be less than 255 characters';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
}

interface UseLoginPageOptions {
  forceBackend?: boolean;
  login?: typeof loginUser;
  verify?: typeof verifyMfa;
}

export function useLoginPage(options?: UseLoginPageOptions) {
  const navigate = useNavigate();
  const useBackend = options?.forceBackend ?? import.meta.env.MODE !== 'test';
  const login = options?.login ?? loginUser;
  const verify = options?.verify ?? verifyMfa;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<Array<'totp' | 'recovery_code'>>([]);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'recovery_code'>('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const finalizeLogin = (result: LoginResult) => {
    if ('challengeRequired' in result) {
      setChallengeToken(result.challengeToken);
      setAvailableMethods(result.availableMethods);
      setMfaMethod(result.availableMethods[0] ?? 'totp');
      setErrors({});
      return false;
    }

    persistSessionUser(result.user);
    dispatchSessionChanged(result.user.id);
    navigate('/diary');
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateLoginForm(email, password);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const trimmedEmail = normalizeEmail(email);

    if (!useBackend) {
      persistTestSessionUser({
        id: 'test-user',
        role: 'USER',
        name: 'Test User',
        email: trimmedEmail,
      });
      dispatchSessionChanged('test-user');
      navigate('/diary');
      return;
    }

    try {
      const result = await login({
        email: trimmedEmail,
        password,
      });
      finalizeLogin(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setErrors((prev) => ({ ...prev, form: message }));
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!challengeToken) {
      setErrors((prev) => ({ ...prev, form: 'MFA challenge is missing. Please sign in again.' }));
      return;
    }

    if (!mfaCode.trim()) {
      setErrors((prev) => ({ ...prev, code: mfaMethod === 'totp' ? 'Authenticator code is required' : 'Recovery code is required' }));
      return;
    }

    try {
      const result = await verify({
        challengeToken,
        code: mfaCode.trim(),
        method: mfaMethod,
      });

      persistSessionUser(result.user);
      dispatchSessionChanged(result.user.id);
      navigate('/diary');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      setErrors((prev) => ({ ...prev, form: message }));
    }
  };

  const resetMfaStage = () => {
    setChallengeToken(null);
    setAvailableMethods([]);
    setMfaMethod('totp');
    setMfaCode('');
    setErrors({});
  };

  return {
    email,
    password,
    mfaCode,
    mfaMethod,
    isMfaStep: Boolean(challengeToken),
    availableMethods,
    setEmail,
    setPassword,
    setMfaCode,
    setMfaMethod,
    handleLogin,
    handleMfaVerify,
    errors,
    goBack: () => navigate('/'),
    goToRegister: () => navigate('/register'),
    goToForgotPassword: () => navigate('/forgot-password'),
    resetMfaStage,
  };
}
