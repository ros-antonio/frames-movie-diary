import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgotPassword } from '../api/movieDiaryApi';
import { ForgotPasswordPage } from './ForgotPasswordPage';

vi.mock('../api/movieDiaryApi', () => ({
  forgotPassword: vi.fn(),
}));

function renderForgotPasswordPage() {
  render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/login" element={<div>Login Route</div>} />
        <Route path="/reset-password" element={<div>Reset Route</div>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(forgotPassword).mockReset();
  });

  it('submits the email, shows the reset token, and navigates to reset', async () => {
    const user = userEvent.setup();
    vi.mocked(forgotPassword).mockResolvedValue({
      message: 'Recovery instructions generated.',
      resetToken: 'reset-token-123',
    });

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Generate recovery token' }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
    expect(await screen.findByText('Recovery instructions generated.')).toBeInTheDocument();
    expect(screen.getByText('reset-token-123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue to reset password' }));
    expect(await screen.findByText('Reset Route')).toBeInTheDocument();
  });

  it('shows the backend error when recovery cannot start', async () => {
    const user = userEvent.setup();
    vi.mocked(forgotPassword).mockRejectedValue(new Error('Could not start password recovery'));

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Generate recovery token' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not start password recovery');
  });
});
