import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login flow for now until auth API is wired.
    navigate('/diary');
  };

  return {
    email,
    password,
    setEmail,
    setPassword,
    handleLogin,
    goBack: () => navigate('/'),
    goToRegister: () => navigate('/register'),
  };
}

