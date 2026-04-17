import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MovieDiary } from './MovieDiary';
import type { MovieLog } from '../types';

function movie(id: string, movieName: string, watchDate: string): MovieLog {
  return { id, movieName, watchDate, frames: [] };
}

describe('MovieDiary', () => {
  it('calls onAddClick and onSelectMovie', async () => {
    const user = userEvent.setup();
    const onAddClick = vi.fn();
    const onSelectMovie = vi.fn();

    render(
      <MemoryRouter>
        <MovieDiary
          movieLogs={[movie('1', 'Arrival', '2026-01-01')]}
          onAddClick={onAddClick}
          onSelectMovie={onSelectMovie}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Log New Movie/i }));
    expect(onAddClick).toHaveBeenCalledOnce();

    await user.click(screen.getByText('Arrival'));
    expect(onSelectMovie).toHaveBeenCalledWith('1');
  });

  it('sorts movies when clicking the Movie Name header', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <MovieDiary
          movieLogs={[
            movie('1', 'Zodiac', '2026-01-01'),
            movie('2', 'Arrival', '2026-01-02'),
          ]}
          onAddClick={vi.fn()}
          onSelectMovie={vi.fn()}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Movie Name/i }));

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1] as HTMLTableRowElement;

    expect(within(firstDataRow).getByText('Arrival')).toBeInTheDocument();
  });

  it('sorts movies by watch date when clicking the Watch Date header', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <MovieDiary
          movieLogs={[
            movie('1', 'Movie A', '2026-01-03'),
            movie('2', 'Movie B', '2026-01-01'),
          ]}
          onAddClick={vi.fn()}
          onSelectMovie={vi.fn()}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Watch Date/i }));

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1] as HTMLTableRowElement;
    expect(within(firstDataRow).getByText('Movie B')).toBeInTheDocument();
  });

  it('switches to card view and selects a movie from card layout', async () => {
    const user = userEvent.setup();
    const onSelectMovie = vi.fn();

    render(
      <MemoryRouter>
        <MovieDiary
          movieLogs={[
            movie('1', 'Arrival', '2026-01-01'),
            movie('2', 'Zodiac', '2026-01-02'),
          ]}
          onAddClick={vi.fn()}
          onSelectMovie={onSelectMovie}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Card view' }));
    await user.click(screen.getByText('Arrival'));

    expect(onSelectMovie).toHaveBeenCalledWith('1');
    expect(screen.queryByRole('button', { name: /Movie Name/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Table view' }));
    expect(screen.getByRole('button', { name: /Movie Name/i })).toBeInTheDocument();
  });

  it('loads additional movies when clicking "Load more movies"', async () => {
    const user = userEvent.setup();
    const movieLogs = Array.from({ length: 13 }, (_, idx) =>
      movie(String(idx + 1), `Movie ${idx + 1}`, `2026-01-${String((idx % 28) + 1).padStart(2, '0')}`),
    );

    render(
      <MemoryRouter>
        <MovieDiary movieLogs={movieLogs} onAddClick={vi.fn()} onSelectMovie={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Movie 13')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Load more movies/i }));

    expect(screen.getByText('Movie 13')).toBeInTheDocument();
  });
});
