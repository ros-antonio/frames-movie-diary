import { ArrowLeft, Film } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/movieDiaryApi';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const payload = await forgotPassword({ email });
      setMessage(payload.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not start password recovery');
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
          <h1 className="text-3xl mb-2 text-[#B9A5D2]">Recover Password</h1>
          <p className="opacity-80 text-[#B9A5D2]">Request a password reset email for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg p-6 space-y-4 bg-[#223662]">
            {error ? <p role="alert" className="text-sm text-[#E0BAAA]">{error}</p> : null}
            {message ? <p className="text-sm text-[#B9A5D2]">{message}</p> : null}

            <div className="space-y-2">
              <label htmlFor="forgot-email" className="block text-sm text-[#B9A5D2]">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md font-semibold bg-[#E0BAAA] text-[#261834] hover:opacity-90 transition-opacity btn-press"
          >
            Request password reset
          </button>
        </form>
      </div>
    </div>
  );
}
