import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<div>Landing Route</div>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register Route</div>} />
        <Route path="/diary" element={<div>Diary Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders required email and password inputs', () => {
    renderLoginPage();

    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });

  it('navigates to diary on sign in submit', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('navigates back to landing page when Back is clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Landing Route')).toBeInTheDocument();
  });

  it('navigates to register page when Create one is clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Create one' }));

    expect(screen.getByText('Register Route')).toBeInTheDocument();
  });
});

