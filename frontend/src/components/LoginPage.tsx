import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login flow for now until auth API is wired.
    navigate('/diary');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#261834]">
      <div className="max-w-md w-full space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center mb-4 text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#223662] flex items-center justify-center">
            <Film className="w-8 h-8 text-[#E0BAAA]" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl mb-2 text-[#B9A5D2]">Welcome Back</h1>
          <p className="opacity-80 text-[#B9A5D2]">Sign in to continue to your movie diary</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="rounded-lg p-6 space-y-4 bg-[#223662]">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-[#B9A5D2]">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm text-[#B9A5D2]">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md font-semibold bg-[#E0BAAA] text-[#261834] hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-[#B9A5D2]">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="hover:underline text-[#E0BAAA]"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

