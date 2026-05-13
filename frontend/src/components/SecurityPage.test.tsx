import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import { beginMfaSetup, disableMfa, enableMfa, getSecurityState, regenerateRecoveryCodes } from '../api/movieDiaryApi';
import { SecurityPage } from './SecurityPage';

const mockQrToDataUrl = vi.mocked(QRCode.toDataURL) as unknown as ReturnType<typeof vi.fn>;

vi.mock('../api/movieDiaryApi', () => ({
  beginMfaSetup: vi.fn(),
  disableMfa: vi.fn(),
  enableMfa: vi.fn(),
  getSecurityState: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(),
  },
}));

function renderSecurityPage(onLoggedOutSecurityChange = vi.fn()) {
  render(
    <MemoryRouter>
      <SecurityPage onLoggedOutSecurityChange={onLoggedOutSecurityChange} />
    </MemoryRouter>,
  );

  return { onLoggedOutSecurityChange };
}

describe('SecurityPage', () => {
  beforeEach(() => {
    vi.mocked(beginMfaSetup).mockReset();
    vi.mocked(disableMfa).mockReset();
    vi.mocked(enableMfa).mockReset();
    vi.mocked(getSecurityState).mockReset();
    vi.mocked(regenerateRecoveryCodes).mockReset();
    mockQrToDataUrl.mockReset();
  });

  it('renders MFA enrollment, validates the code locally, and shows recovery codes after enabling', async () => {
    const user = userEvent.setup();
    const initialState = {
      mfaEnabled: false,
      recoveryCodesRemaining: 0,
      role: 'USER',
      permissions: ['LIST_READ_OWN', 'MOVIE_WRITE_OWN'],
    };

    vi.mocked(getSecurityState)
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce({
        ...initialState,
        mfaEnabled: true,
        recoveryCodesRemaining: 2,
      });
    vi.mocked(beginMfaSetup).mockResolvedValue({
      secret: 'SECRET123',
      otpAuthUri: 'otpauth://totp/Frames:tony@example.com?secret=SECRET123',
    });
    mockQrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    vi.mocked(enableMfa).mockResolvedValue({
      recoveryCodes: ['AAAAAA-BBBBBB', 'CCCCCC-DDDDDD'],
    });

    const { onLoggedOutSecurityChange } = renderSecurityPage();

    expect(await screen.findByText('USER')).toBeInTheDocument();
    expect(screen.getByText('LIST_READ_OWN')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start MFA setup' }));

    expect(await screen.findByAltText('MFA setup QR code')).toBeInTheDocument();
    expect(screen.getByText(/Manual secret:/i)).toHaveTextContent('SECRET123');

    await user.click(screen.getByRole('button', { name: 'Enable MFA' }));
    expect(await screen.findByText('Enter the 6-digit code from your authenticator app.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('6-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Enable MFA' }));

    await waitFor(() => {
      expect(enableMfa).toHaveBeenCalledWith({ code: '123456' });
    });
    expect(await screen.findByText('MFA enabled. Save the recovery codes, then sign in again.')).toBeInTheDocument();
    expect(screen.getByText('AAAAAA-BBBBBB')).toBeInTheDocument();
    expect(screen.getByText('CCCCCC-DDDDDD')).toBeInTheDocument();
    expect(onLoggedOutSecurityChange).toHaveBeenCalledTimes(1);
  });

  it('supports regenerating recovery codes and disabling MFA with local validation', async () => {
    const user = userEvent.setup();
    vi.mocked(getSecurityState).mockResolvedValue({
      mfaEnabled: true,
      recoveryCodesRemaining: 5,
      role: 'USER',
      permissions: ['LIST_READ_OWN'],
    });
    vi.mocked(regenerateRecoveryCodes).mockResolvedValue({
      recoveryCodes: ['EEEEEE-FFFFFF'],
    });
    vi.mocked(disableMfa).mockResolvedValue(undefined);

    const { onLoggedOutSecurityChange } = renderSecurityPage();

    expect(await screen.findByText('Enabled')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Regenerate recovery codes' }));
    expect(await screen.findByText('Enter the current 6-digit authenticator code to rotate recovery codes.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Current 6-digit authenticator code'), '654321');
    await user.click(screen.getByRole('button', { name: 'Regenerate recovery codes' }));

    await waitFor(() => {
      expect(regenerateRecoveryCodes).toHaveBeenCalledWith({ code: '654321' });
    });
    expect(await screen.findByText('Recovery codes regenerated. Save them, then sign in again.')).toBeInTheDocument();
    expect(screen.getByText('EEEEEE-FFFFFF')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Current password to disable MFA'));
    await user.type(screen.getByPlaceholderText('Current password to disable MFA'), '123');
    await user.click(screen.getByRole('button', { name: 'Disable MFA' }));
    expect(await screen.findByText('Enter your current password to disable MFA.')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Current password to disable MFA'));
    await user.type(screen.getByPlaceholderText('Current password to disable MFA'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Disable MFA' }));

    await waitFor(() => {
      expect(disableMfa).toHaveBeenCalledWith({ password: 'password123' });
    });
    expect(onLoggedOutSecurityChange).toHaveBeenCalledTimes(2);
  });

  it('shows a friendly message when security state cannot be loaded', async () => {
    vi.mocked(getSecurityState).mockRejectedValue(new Error('boom'));

    renderSecurityPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load security state');
  });
});
