import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MovieDetail } from './MovieDetail';
import type { MovieLog } from '../types';

const baseMovie: MovieLog = {
  id: 'movie-1',
  movieName: 'Arrival',
  watchDate: '2026-01-01',
  frames: [],
};

describe('MovieDetail', () => {
  it('renders unrated state when rating is missing', () => {
    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('calls onBack and onEdit from action buttons', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onEdit = vi.fn();

    render(<MovieDetail movie={{ ...baseMovie, rating: 4 }} onBack={onBack} onDelete={vi.fn()} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));
    await user.click(screen.getByTitle('Edit Movie'));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('calls onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

    await user.click(screen.getByTitle('Delete Movie'));

    expect(onDelete).toHaveBeenCalledWith('movie-1');
  });

  it('shows feature alert when clicking Capture New Frame', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Capture New Frame/i }));

    expect(alertSpy).toHaveBeenCalledOnce();
  });

  it('renders movie link when provided', () => {
    render(
      <MovieDetail
        movie={{ ...baseMovie, movieLink: 'magnet:?xt=urn:btih:aabbcc' }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'magnet:?xt=urn:btih:aabbcc' })).toBeInTheDocument();
  });
});

