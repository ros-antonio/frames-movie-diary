import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
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
    goBack: () => navigate('/'),
    goToLogin: () => navigate('/login'),
  };
}

