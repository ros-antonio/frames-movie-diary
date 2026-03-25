import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('goes from landing to diary', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Enter Diary' }));

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
  });

  it('opens add movie screen and returns to diary on cancel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Enter Diary' }));
    await user.click(screen.getByRole('button', { name: /Log New Movie/i }));

    expect(screen.getByRole('heading', { name: 'Log New Movie' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Movie Diary' })).toBeInTheDocument();
  });

  it('adds, edits, and deletes a movie through app flow', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Enter Diary' }));
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
});

