import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { movieDiaryApi } from '../api/movieDiaryApi';
import { AdminDashboard } from './AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

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

  it('deletes another user and keeps current admin protected from self-delete', async () => {
    const user = userEvent.setup();
    localStorage.setItem('userId', 'admin-1');

    vi.spyOn(movieDiaryApi, 'getUsers').mockResolvedValue([
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        permissions: ['ADMIN_VIEW_USERS', 'ADMIN_DELETE_USERS'],
        movieCount: 2,
        listCount: 1,
      },
      {
        id: 'user-2',
        name: 'Regular User',
        email: 'user2@example.com',
        role: 'USER',
        permissions: ['MOVIE_READ_OWN'],
        movieCount: 3,
        listCount: 2,
      },
    ]);

    vi.spyOn(movieDiaryApi, 'deleteUser').mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminDashboard onBack={vi.fn()} />);

    expect(await screen.findByText('Regular User')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(2);
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).toBeEnabled();

    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(movieDiaryApi.deleteUser).toHaveBeenCalledWith('user-2');
    });

    await waitFor(() => {
      expect(screen.queryByText('Regular User')).not.toBeInTheDocument();
    });
  });
});
