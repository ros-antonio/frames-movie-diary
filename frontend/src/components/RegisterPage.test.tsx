import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/" element={<div>Landing Route</div>} />
        <Route path="/login" element={<div>Login Route</div>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/diary" element={<div>Diary Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  it('renders required name, email, password, and confirm password inputs', () => {
    renderRegisterPage();

    expect(screen.getByLabelText('Name')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByLabelText('Confirm Password')).toBeRequired();
  });

  it('navigates to diary on successful registration submit', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText('Name'), 'Tony');
    await user.type(screen.getByLabelText('Email'), 'tony@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('shows alert and does not navigate when passwords do not match', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    renderRegisterPage();

    await user.type(screen.getByLabelText('Name'), 'Tony');
    await user.type(screen.getByLabelText('Email'), 'tony@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'different-password');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(alertSpy).toHaveBeenCalledWith('Passwords do not match');
    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('navigates back to landing page when Back is clicked', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Landing Route')).toBeInTheDocument();
  });

  it('navigates to login page when Sign in is clicked', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Login Route')).toBeInTheDocument();
  });
});

