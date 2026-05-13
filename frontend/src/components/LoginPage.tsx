import { Film, ArrowLeft } from 'lucide-react';
import { useLoginPage } from '../hooks/useLoginPage';

export function LoginPage() {
  const {
    email,
    password,
    mfaCode,
    mfaMethod,
    isMfaStep,
    availableMethods,
    setEmail,
    setPassword,
    setMfaCode,
    setMfaMethod,
    handleLogin,
    handleMfaVerify,
    errors,
    goBack,
    goToRegister,
    goToForgotPassword,
    resetMfaStage,
  } = useLoginPage();

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
          <h1 className="text-3xl mb-2 text-[#B9A5D2]">{isMfaStep ? 'Verify Sign In' : 'Welcome Back'}</h1>
          <p className="opacity-80 text-[#B9A5D2]">
            {isMfaStep ? 'Complete your second step to access your movie diary' : 'Sign in to continue to your movie diary'}
          </p>
        </div>

        <form onSubmit={isMfaStep ? handleMfaVerify : handleLogin} className="space-y-6">
          <div className="rounded-lg p-6 space-y-4 bg-[#223662]">
            {errors.form ? (
              <p role="alert" className="text-sm text-[#E0BAAA]">
                {errors.form}
              </p>
            ) : null}

            {isMfaStep ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="mfa-method" className="block text-sm text-[#B9A5D2]">
                    Verification method
                  </label>
                  <select
                    id="mfa-method"
                    value={mfaMethod}
                    onChange={(e) => setMfaMethod(e.target.value as 'totp' | 'recovery_code')}
                    className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
                  >
                    {availableMethods.map((method) => (
                      <option key={method} value={method}>
                        {method === 'totp' ? 'Authenticator app code' : 'Recovery code'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="mfa-code" className="block text-sm text-[#B9A5D2]">
                    {mfaMethod === 'totp' ? 'Authenticator code' : 'Recovery code'}
                  </label>
                  <input
                    id="mfa-code"
                    type="text"
                    placeholder={mfaMethod === 'totp' ? '123456' : 'ABC123-DEF456'}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    aria-invalid={Boolean(errors.code)}
                    aria-describedby={errors.code ? 'mfa-code-error' : undefined}
                    className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
                  />
                  {errors.code ? (
                    <p id="mfa-code-error" role="alert" className="text-sm text-[#E0BAAA]">
                      {errors.code}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
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

                <div className="text-right">
                  <button
                    type="button"
                    onClick={goToForgotPassword}
                    className="text-sm text-[#E0BAAA] hover:underline btn-press"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md font-semibold bg-[#E0BAAA] text-[#261834] hover:opacity-90 transition-opacity btn-press"
          >
            {isMfaStep ? 'Verify code' : 'Sign In'}
          </button>

          {isMfaStep ? (
            <button
              type="button"
              onClick={resetMfaStage}
              className="w-full py-3 rounded-md font-semibold border border-[#E0BAAA] text-[#E0BAAA] hover:opacity-90 transition-opacity btn-press"
            >
              Back to sign in
            </button>
          ) : null}
        </form>

        <p className="text-center text-[#B9A5D2]">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={goToRegister}
            className="hover:underline text-[#E0BAAA] btn-press"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
