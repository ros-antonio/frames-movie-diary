import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { beginMfaSetup, disableMfa, enableMfa, getSecurityState, regenerateRecoveryCodes } from '../api/movieDiaryApi';
import type { SecurityState } from '../types';

interface SecurityPageProps {
  onLoggedOutSecurityChange: () => void;
}

export function SecurityPage({ onLoggedOutSecurityChange }: SecurityPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<SecurityState | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [freshRecoveryCodes, setFreshRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enableCodeError, setEnableCodeError] = useState<string | null>(null);
  const [regenCodeError, setRegenCodeError] = useState<string | null>(null);
  const [disablePasswordError, setDisablePasswordError] = useState<string | null>(null);

  const normalizeTotpCode = (value: string) => value.replace(/\s+/g, '');
  const isValidTotpCode = (value: string) => /^\d{6}$/.test(normalizeTotpCode(value));

  useEffect(() => {
    let isActive = true;

    void getSecurityState().then((payload) => {
      if (isActive) {
        setState(payload);
      }
    }).catch(() => {
      if (isActive) {
        setError('Could not load security state');
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!setupUri) {
      return;
    }

    let isActive = true;

    void QRCode.toDataURL(setupUri, {
      width: 220,
      margin: 1,
      color: {
        dark: '#F0E8FA',
        light: '#162341',
      },
    }).then((dataUrl) => {
      if (isActive) {
        setSetupQrCode(dataUrl);
      }
    }).catch(() => {
      if (isActive) {
        setSetupQrCode(null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [setupUri]);

  return (
    <div className="min-h-screen bg-[#261834] p-8 text-[#B9A5D2]">
      <div className="mx-auto max-w-3xl space-y-8">
        <button
          onClick={() => navigate('/diary')}
          className="flex items-center text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors btn-press"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to diary
        </button>

        <div className="rounded-2xl bg-[#162341] p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-[#E0BAAA]" />
            <div>
              <h1 className="text-3xl text-[#F0E8FA]">Security Center</h1>
              <p className="opacity-80">Manage MFA, recovery codes, and your current permission scheme.</p>
            </div>
          </div>

          {error ? <p role="alert" className="mb-4 text-sm text-[#E0BAAA]">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-[#B9A5D2]">{message}</p> : null}

          {state ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[#223662] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Role</p>
                  <p className="mt-2 text-lg text-[#F0E8FA]">{state.role}</p>
                </div>
                <div className="rounded-xl bg-[#223662] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">MFA status</p>
                  <p className="mt-2 text-lg text-[#F0E8FA]">{state.mfaEnabled ? 'Enabled' : 'Disabled'}</p>
                  <p className="mt-1 text-sm opacity-80">Recovery codes remaining: {state.recoveryCodesRemaining}</p>
                </div>
              </div>

              <div className="rounded-xl bg-[#223662] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Permissions in token scheme</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {state.permissions.map((permission) => (
                    <span key={permission} className="rounded-md border border-[#E0BAAA]/25 px-2 py-1 text-xs text-[#F0E8FA]">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              {!state.mfaEnabled ? (
                <div className="rounded-xl bg-[#223662] p-4 space-y-4">
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      setMessage(null);
                      try {
                        const payload = await beginMfaSetup();
                        setSetupSecret(payload.secret);
                        setSetupUri(payload.otpAuthUri);
                        setSetupQrCode(null);
                        setEnableCode('');
                        setEnableCodeError(null);
                        setFreshRecoveryCodes([]);
                      } catch (setupError) {
                        setError(setupError instanceof Error ? setupError.message : 'Could not start MFA setup');
                      }
                    }}
                    className="rounded-md bg-[#E0BAAA] px-4 py-2 font-semibold text-[#261834] btn-press"
                  >
                    Start MFA setup
                  </button>

                  {setupSecret ? (
                    <div className="space-y-3 rounded-md border border-[#E0BAAA]/25 bg-[#261834] p-4">
                      <p className="text-sm text-[#B9A5D2]">
                        Scan this QR code in Google Authenticator, 1Password, Authy, or another TOTP app.
                        If scanning is not available, use the manual secret below.
                      </p>
                      {setupQrCode ? (
                        <div className="flex justify-center rounded-md bg-[#162341] p-4">
                          <img
                            src={setupQrCode}
                            alt="MFA setup QR code"
                            className="h-[220px] w-[220px] rounded-md"
                          />
                        </div>
                      ) : null}
                      <p className="text-sm">Manual secret: <span className="break-all text-[#F0E8FA]">{setupSecret}</span></p>
                      <p className="text-sm">OTP URI: <span className="break-all text-[#F0E8FA]">{setupUri}</span></p>
                      <p className="text-xs text-[#B9A5D2]/80">
                        If your app still shows a different code, check that the device clock is set automatically.
                      </p>
                      <input
                        value={enableCode}
                        onChange={(event) => {
                          setEnableCode(event.target.value);
                          setEnableCodeError(null);
                        }}
                        placeholder="6-digit authenticator code"
                        inputMode="numeric"
                        maxLength={6}
                        aria-invalid={Boolean(enableCodeError)}
                        aria-describedby={enableCodeError ? 'enable-code-error' : undefined}
                        className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#162341] text-[#B9A5D2] input-smooth"
                      />
                      {enableCodeError ? (
                        <p id="enable-code-error" role="alert" className="text-sm text-[#E0BAAA]">
                          {enableCodeError}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setMessage(null);
                          if (!isValidTotpCode(enableCode)) {
                            setEnableCodeError('Enter the 6-digit code from your authenticator app.');
                            return;
                          }

                          try {
                            const payload = await enableMfa({ code: normalizeTotpCode(enableCode) });
                            setFreshRecoveryCodes(payload.recoveryCodes);
                            setMessage('MFA enabled. Save the recovery codes, then sign in again.');
                            const nextState = await getSecurityState();
                            setState(nextState);
                            onLoggedOutSecurityChange();
                          } catch (enableError) {
                            setError(enableError instanceof Error ? enableError.message : 'Could not enable MFA');
                          }
                        }}
                        className="rounded-md border border-[#E0BAAA] px-4 py-2 text-[#E0BAAA] btn-press"
                      >
                        Enable MFA
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl bg-[#223662] p-4 space-y-4">
                  <div className="space-y-3">
                    <input
                      value={regenCode}
                      onChange={(event) => {
                        setRegenCode(event.target.value);
                        setRegenCodeError(null);
                      }}
                      placeholder="Current 6-digit authenticator code"
                      inputMode="numeric"
                      maxLength={6}
                      aria-invalid={Boolean(regenCodeError)}
                      aria-describedby={regenCodeError ? 'regen-code-error' : undefined}
                      className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
                    />
                    {regenCodeError ? (
                      <p id="regen-code-error" role="alert" className="text-sm text-[#E0BAAA]">
                        {regenCodeError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setMessage(null);
                          if (!isValidTotpCode(regenCode)) {
                            setRegenCodeError('Enter the current 6-digit authenticator code to rotate recovery codes.');
                            return;
                          }

                          try {
                            const payload = await regenerateRecoveryCodes({ code: normalizeTotpCode(regenCode) });
                            setFreshRecoveryCodes(payload.recoveryCodes);
                            setMessage('Recovery codes regenerated. Save them, then sign in again.');
                            onLoggedOutSecurityChange();
                          } catch (regenError) {
                            setError(regenError instanceof Error ? regenError.message : 'Could not regenerate recovery codes');
                          }
                        }}
                        className="rounded-md border border-[#E0BAAA] px-4 py-2 text-[#E0BAAA] btn-press"
                      >
                        Regenerate recovery codes
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[#B9A5D2]/15 pt-4">
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(event) => {
                        setDisablePassword(event.target.value);
                        setDisablePasswordError(null);
                      }}
                      placeholder="Current password to disable MFA"
                      aria-invalid={Boolean(disablePasswordError)}
                      aria-describedby={disablePasswordError ? 'disable-password-error' : undefined}
                      className="w-full px-4 py-3 rounded-md border-0 outline-none bg-[#261834] text-[#B9A5D2] input-smooth"
                    />
                    {disablePasswordError ? (
                      <p id="disable-password-error" role="alert" className="text-sm text-[#E0BAAA]">
                        {disablePasswordError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={async () => {
                        setError(null);
                        setMessage(null);
                        if (disablePassword.trim().length < 6) {
                          setDisablePasswordError('Enter your current password to disable MFA.');
                          return;
                        }

                        try {
                          await disableMfa({ password: disablePassword });
                          setMessage('MFA disabled. Sign in again to continue.');
                          onLoggedOutSecurityChange();
                        } catch (disableError) {
                          setError(disableError instanceof Error ? disableError.message : 'Could not disable MFA');
                        }
                      }}
                      className="rounded-md border border-red-400/40 px-4 py-2 text-red-100 btn-press"
                    >
                      Disable MFA
                    </button>
                  </div>
                </div>
              )}

              {freshRecoveryCodes.length > 0 ? (
                <div className="rounded-xl border border-[#E0BAAA]/25 bg-[#223662] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Recovery codes</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {freshRecoveryCodes.map((code) => (
                      <code key={code} className="rounded bg-[#261834] px-3 py-2 text-sm text-[#F0E8FA]">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p>Loading security state...</p>
          )}
        </div>
      </div>
    </div>
  );
}
