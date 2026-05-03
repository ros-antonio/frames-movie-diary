import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/movieDiaryApi';
import { EMAIL_REGEX, normalizeEmail } from '../utils/formValidation';

interface FormErrors {
  email?: string;
  password?: string;
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
}

export function useLoginPage(options?: UseLoginPageOptions) {
  const navigate = useNavigate();
  const useBackend = options?.forceBackend ?? import.meta.env.MODE !== 'test';
  const login = options?.login ?? loginUser;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateLoginForm(email, password);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const trimmedEmail = normalizeEmail(email);

    if (!useBackend) {
      navigate('/diary');
      return;
    }

    try {
      const { user, token } = await login({
        email: trimmedEmail,
        password,
      });

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', user.role);

      localStorage.removeItem('movie-diary.movies-cache.v1');
      localStorage.removeItem('movie-diary.lists-cache.v1');
      localStorage.removeItem('movie-diary.offline-queue.v1');

      window.dispatchEvent(new CustomEvent('userIdChanged', { detail: { userId: user.id } }));

      navigate('/diary');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setErrors((prev) => ({ ...prev, form: message }));
    }
  };

  return {
    email,
    password,
    setEmail,
    setPassword,
    handleLogin,
    errors,
    goBack: () => navigate('/'),
    goToRegister: () => navigate('/register'),
  };
}