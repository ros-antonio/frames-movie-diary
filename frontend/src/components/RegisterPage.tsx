import { Film, ArrowLeft } from 'lucide-react';
import { useRegisterPage } from '../hooks/useRegisterPage';

export function RegisterPage() {
  const {
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
    goBack,
    goToLogin,
  } = useRegisterPage();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#261834]">
      <div className="max-w-md w-full space-y-8">
        <button
          onClick={goBack}
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
          <h1 className="text-3xl mb-2 text-[#B9A5D2]">Create Account</h1>
          <p className="opacity-80 text-[#B9A5D2]">Start your personal cinema journey</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="rounded-lg p-6 space-y-4 bg-[#223662]">
            {errors.form ? (
              <p role="alert" className="text-sm text-[#E0BAAA]">
                {errors.form}
              </p>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm text-[#B9A5D2]">
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              />
              {errors.name ? (
                <p id="name-error" role="alert" className="text-sm text-[#E0BAAA]">
                  {errors.name}
                </p>
              ) : null}
            </div>

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
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              />
              {errors.email ? (
                <p id="email-error" role="alert" className="text-sm text-[#E0BAAA]">
                  {errors.email}
                </p>
              ) : null}
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
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              />
              {errors.password ? (
                <p id="password-error" role="alert" className="text-sm text-[#E0BAAA]">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm text-[#B9A5D2]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
              />
              {errors.confirmPassword ? (
                <p id="confirm-password-error" role="alert" className="text-sm text-[#E0BAAA]">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md font-semibold bg-[#E0BAAA] text-[#261834] hover:opacity-90 transition-opacity btn-press"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-[#B9A5D2]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={goToLogin}
            className="hover:underline text-[#E0BAAA] btn-press"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

