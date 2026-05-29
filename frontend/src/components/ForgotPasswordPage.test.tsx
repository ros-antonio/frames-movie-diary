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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(forgotPassword).mockReset();
  });

  it('submits the email and shows a neutral success message', async () => {
    const user = userEvent.setup();
    vi.mocked(forgotPassword).mockResolvedValue({
      message: 'Recovery instructions generated.',
    });

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Request password reset' }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
    expect(await screen.findByText('Recovery instructions generated.')).toBeInTheDocument();
    expect(screen.queryByText('Reset token')).not.toBeInTheDocument();
  });

  it('shows the backend error when recovery cannot start', async () => {
    const user = userEvent.setup();
    vi.mocked(forgotPassword).mockRejectedValue(new Error('Could not start password recovery'));

    renderForgotPasswordPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Request password reset' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not start password recovery');
  });
});
