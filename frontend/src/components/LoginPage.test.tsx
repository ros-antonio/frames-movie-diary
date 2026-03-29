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

  it('navigates to diary on sign in submit with valid credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('does not navigate when email is empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when password is empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when email format is invalid', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when email has no @', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'useremail.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when email has no domain', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when password is too short', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'pass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('accepts email with whitespace and trims it', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), '  user@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('treats uppercase and lowercase emails as equivalent', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'USER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('does not navigate when email exceeds 255 characters', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const longEmail = 'a'.repeat(250) + '@example.com';
    await user.type(screen.getByLabelText('Email'), longEmail);
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('does not navigate when email is missing TLD', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@localhost');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.queryByText('Diary Route')).not.toBeInTheDocument();
  });

  it('accepts valid email with subdomain', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@mail.example.com');
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

  it('allows clearing and re-entering credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'wrong@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'correct@example.com');

    await user.type(passwordInput, 'wrongpass');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'correctpass123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });
});
