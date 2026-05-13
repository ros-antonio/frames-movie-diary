import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPassword } from '../api/movieDiaryApi';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../api/movieDiaryApi', () => ({
  resetPassword: vi.fn(),
}));

function renderResetPasswordPage(initialEntry = '/reset-password?token=seeded-token') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Route</div>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(resetPassword).mockReset();
  });

  it('prefills the token from the URL and resets the password successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(resetPassword).mockResolvedValue(undefined);

    renderResetPasswordPage();

    expect(screen.getByPlaceholderText('Reset token')).toHaveValue('seeded-token');

    await user.type(screen.getByPlaceholderText('New password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        token: 'seeded-token',
        password: 'password123',
        confirmPassword: 'password123',
      });
    });
    expect(await screen.findByText('Password updated successfully. You can sign in again now.')).toBeInTheDocument();
  });

  it('shows the backend error when reset fails', async () => {
    const user = userEvent.setup();
    vi.mocked(resetPassword).mockRejectedValue(new Error('Reset token is invalid or expired'));

    renderResetPasswordPage('/reset-password');

    await user.type(screen.getByPlaceholderText('Reset token'), 'bad-token');
    await user.type(screen.getByPlaceholderText('New password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Reset token is invalid or expired');
  });
});
