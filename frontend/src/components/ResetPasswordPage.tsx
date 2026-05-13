import { ArrowLeft, Film } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/movieDiaryApi';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await resetPassword({ token, password, confirmPassword });
      setMessage('Password updated successfully. You can sign in again now.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not reset password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#261834]">
      <div className="max-w-md w-full space-y-8">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center mb-4 text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors btn-press"
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
          <h1 className="text-3xl mb-2 text-[#B9A5D2]">Set New Password</h1>
          <p className="opacity-80 text-[#B9A5D2]">Use your recovery token to finish the reset</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg p-6 space-y-4 bg-[#223662]">
            {error ? <p role="alert" className="text-sm text-[#E0BAAA]">{error}</p> : null}
            {message ? <p className="text-sm text-[#B9A5D2]">{message}</p> : null}

            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Reset token"
              className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md font-semibold bg-[#E0BAAA] text-[#261834] hover:opacity-90 transition-opacity btn-press"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
