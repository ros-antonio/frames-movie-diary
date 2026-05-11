import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('opens the dropdown and shows user details', async () => {
    const user = userEvent.setup();

    render(
      <AccountMenu
        name="Tony Stark"
        email="tony@example.com"
        role="ADMIN"
        onLogout={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByText('Tony Stark')).toBeInTheDocument();
    expect(within(menu).getByText('tony@example.com')).toBeInTheDocument();
    expect(within(menu).getByText('ADMIN')).toBeInTheDocument();
  });

  it('calls logout when the logout action is selected', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <AccountMenu
        name="Tony Stark"
        email="tony@example.com"
        role="ADMIN"
        onLogout={onLogout}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('closes the dropdown when escape is pressed', async () => {
    const user = userEvent.setup();

    render(
      <AccountMenu
        name="Tony Stark"
        email="tony@example.com"
        role="ADMIN"
        onLogout={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
