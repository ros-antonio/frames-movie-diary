import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

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

    expect(screen.getByRole('heading', { name: 'Updated Title' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Delete Movie'));

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
    expect(screen.queryByText('Updated Title')).not.toBeInTheDocument();
    expect(screen.getByText('Second Title')).toBeInTheDocument();
  });

  it('redirects to diary when editing a movie that does not exist', () => {
    renderApp(['/diary/non-existent-id/edit']);

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Edit Movie' })).not.toBeInTheDocument();
  });
});
