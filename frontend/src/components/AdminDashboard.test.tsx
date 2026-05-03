import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { movieDiaryApi } from '../api/movieDiaryApi';
import { AdminDashboard } from './AdminDashboard';

describe('AdminDashboard', () => {
  it('loads and renders users with roles and permissions', async () => {
    vi.spyOn(movieDiaryApi, 'getUsers').mockResolvedValue([
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        permissions: ['ADMIN_VIEW_USERS', 'MOVIE_READ_ALL'],
        movieCount: 4,
        listCount: 2,
      },
      {
        id: 'user-1',
        name: 'Normal User',
        email: 'user@example.com',
        role: 'USER',
        permissions: ['MOVIE_READ_OWN'],
        movieCount: 1,
        listCount: 1,
      },
    ]);

    render(<AdminDashboard onBack={vi.fn()} />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Normal User')).toBeInTheDocument();
    expect(screen.getByText('ADMIN_VIEW_USERS, MOVIE_READ_ALL')).toBeInTheDocument();
  });

  it('shows load errors and supports back navigation', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    vi.spyOn(movieDiaryApi, 'getUsers').mockRejectedValue(new Error('Forbidden'));

    render(<AdminDashboard onBack={onBack} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders an empty state when there are no users', async () => {
    vi.spyOn(movieDiaryApi, 'getUsers').mockResolvedValue([]);

    render(<AdminDashboard onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });
});
