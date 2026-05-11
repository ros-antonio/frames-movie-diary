import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import * as useAppStateModule from './hooks/useAppState';

vi.mock('./hooks/useUserActivity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useUserActivity')>();

  return {
    ...actual,
    useUserActivity: () => ({
      logActivity: vi.fn(),
    }),
  };
});

describe('App', () => {
  beforeEach(() => {
    let counter = 1;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() =>
      `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`,
    );
  });

  async function addMovie(container: HTMLElement, user: ReturnType<typeof userEvent.setup>, title: string, date: string) {
    await user.click(screen.getByRole('button', { name: /Log New Movie/i }));

    const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

    await user.clear(titleInput);
    await user.type(titleInput, title);
    await user.clear(dateInput);
    await user.type(dateInput, date);
    await user.click(screen.getByRole('button', { name: /Save Movie/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
    });
  }

  function renderApp(initialEntries: string[] = ['/']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>,
    );
  }

  async function loginToDiary(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
  }

  it('goes from landing to diary', async () => {
    const user = userEvent.setup();
    renderApp();

    await loginToDiary(user);

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
  });

  it('opens add movie screen and returns to diary on cancel', async () => {
    const user = userEvent.setup();
    renderApp();

    await loginToDiary(user);
    await user.click(screen.getByRole('button', { name: /Log New Movie/i }));

    expect(screen.getByRole('heading', { name: 'Log New Movie' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
  });

  it('adds, edits, and deletes a movie through app flow', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = renderApp();

    await loginToDiary(user);
    await addMovie(container, user, 'First Title', '2026-03-24');
    await addMovie(container, user, 'Second Title', '2026-03-23');

    await user.click(screen.getByText('First Title'));
    expect(screen.getByRole('heading', { name: 'First Title' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));
    await user.click(screen.getByText('First Title'));

    await user.click(screen.getByTitle('Edit Movie'));
    expect(screen.getByRole('heading', { name: 'Edit Movie' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByRole('heading', { name: 'First Title' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Edit Movie'));

    const editTitleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.clear(editTitleInput);
    await user.type(editTitleInput, 'Updated Title');
    await user.click(screen.getByRole('button', { name: /Update Movie/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Updated Title' })).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Delete Movie'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Updated Title')).not.toBeInTheDocument();
    expect(screen.getByText('Second Title')).toBeInTheDocument();
  }, 15000);

  it('redirects to diary when editing a movie that does not exist', async () => {
    localStorage.setItem('userId', 'test-user');
    renderApp(['/diary/non-existent-id/edit']);

    expect(await screen.findByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Edit Movie' })).not.toBeInTheDocument();
  });

  it('redirects protected routes to login when there is no session', async () => {
    renderApp(['/diary']);

    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
  });

  it('redirects non-admin users away from admin route', async () => {
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('userRole', 'USER');

    renderApp(['/admin']);

    expect(await screen.findByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
  });

  it('allows admin users to open admin route', async () => {
    localStorage.setItem('userId', 'test-admin');
    localStorage.setItem('userRole', 'ADMIN');
    localStorage.setItem('userName', 'Admin User');
    localStorage.setItem('userEmail', 'admin@example.com');

    renderApp(['/admin']);

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
  });

  it('shows the account menu for authenticated routes and logs out cleanly', async () => {
    const user = userEvent.setup();
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem('userName', 'Tony Stark');
    localStorage.setItem('userEmail', 'tony@example.com');

    renderApp(['/diary']);

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByText('Tony Stark')).toBeInTheDocument();
    expect(within(menu).getByText('tony@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(localStorage.getItem('userName')).toBeNull();
    expect(localStorage.getItem('userEmail')).toBeNull();
  });

  it('shows sync banner and dismissible operation errors when app state exposes them', async () => {
    const user = userEvent.setup();
    const clearOperationError = vi.fn();
    const syncPendingOperations = vi.fn().mockResolvedValue(undefined);

    const useAppStateSpy = vi.spyOn(useAppStateModule, 'useAppState').mockReturnValue({
      movieLogs: [],
      customLists: [],
      isOffline: true,
      pendingSyncCount: 2,
      operationError: 'Something went wrong',
      clearOperationError,
      syncPendingOperations,
      refreshLists: vi.fn(),
      handleAddMovie: vi.fn(),
      handleUpdateMovie: vi.fn(),
      handleDeleteMovie: vi.fn(),
      handleCreateList: vi.fn(),
      handleDeleteList: vi.fn(),
      handleAddMovieToList: vi.fn(),
      handleRemoveMovieFromList: vi.fn(),
      handleAddFrameToMovie: vi.fn(),
      handleDeleteFrameFromMovie: vi.fn(),
    });

    try {
      renderApp(['/login']);

      expect(screen.getByText(/Offline mode enabled. Pending sync operations: 2./i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Sync now' }));
      expect(syncPendingOperations).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(clearOperationError).toHaveBeenCalledTimes(1);
    } finally {
      useAppStateSpy.mockRestore();
    }
  });
});
