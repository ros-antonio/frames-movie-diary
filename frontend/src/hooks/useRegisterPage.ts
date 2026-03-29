import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

function validateRegistrationForm(name: string, email: string, password: string, confirmPassword: string): FormErrors {
  const errors: FormErrors = {};

  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = 'Name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (trimmedName.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  } else if (!NAME_REGEX.test(trimmedName)) {
    errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }

  const trimmedEmail = email.trim().toLowerCase();
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
  } else if (password.length > 128) {
    errors.password = 'Password must be less than 128 characters';
  } else if (!/[a-zA-Z]/.test(password)) {
    errors.password = 'Password must contain at least one letter';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one number';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export function useRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateRegistrationForm(name, email, password, confirmPassword);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Mock registration flow for now until auth API is wired.
    navigate('/diary');
  };

  return {
    name,
    email,
    password,
    confirmPassword,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    handleRegister,
    errors,
    goBack: () => navigate('/'),
    goToLogin: () => navigate('/login'),
  };
}

