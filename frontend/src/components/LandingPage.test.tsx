import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('calls onLogin when Login is clicked', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(<LandingPage onLogin={onLogin} onRegister={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('calls onRegister when Register is clicked', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();

    render(<LandingPage onLogin={vi.fn()} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(onRegister).toHaveBeenCalledOnce();
  });
});

