import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CustomLists } from './CustomLists';
import type { MovieLog } from '../types';
import type { CustomList } from '../types.ts';

function renderCustomLists(
  movieLogs: MovieLog[] = [],
  customLists: CustomList[] = [],
  onCreateList = vi.fn(),
  onDeleteList = vi.fn(),
  onAddMovieToList = vi.fn(),
  onRemoveMovieFromList = vi.fn(),
) {
  return render(
    <MemoryRouter initialEntries={['/custom-lists']}>
      <Routes>
        <Route path="/diary" element={<div>Diary Route</div>} />
        <Route
          path="/custom-lists"
          element={
            <CustomLists
              movieLogs={movieLogs}
              customLists={customLists}
              onCreateList={onCreateList}
              onDeleteList={onDeleteList}
              onAddMovieToList={onAddMovieToList}
              onRemoveMovieFromList={onRemoveMovieFromList}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomLists', () => {
  it('renders the Custom Lists heading', () => {
    renderCustomLists();

    expect(screen.getByRole('heading', { name: 'Custom Lists' })).toBeInTheDocument();
  });

  it('shows empty state when no lists exist', () => {
    renderCustomLists();

    expect(screen.getByText('No custom lists created yet. Click "Create New List" to get started!')).toBeInTheDocument();
  });

  it('displays all custom lists in table', () => {
    const lists: CustomList[] = [
      {
        id: 'list-1',
        name: 'Sci-Fi',
        description: 'Science fiction films',
        movieIds: ['movie-1'],
      },
      {
        id: 'list-2',
        name: 'Comedy',
        description: 'Funny films',
        movieIds: [],
      },
    ];

    renderCustomLists([], lists);

    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('Science fiction films')).toBeInTheDocument();
  });

  it('displays correct movie count for each list', () => {
    const lists: CustomList[] = [
      { id: 'list-1', name: 'List A', description: 'Desc', movieIds: ['m1', 'm2', 'm3'] },
      { id: 'list-2', name: 'List B', description: 'Desc', movieIds: ['m1'] },
    ];

    renderCustomLists([], lists);

    const counts = screen.getAllByText(/^3$|^1$/);
    expect(counts.length).toBeGreaterThan(0);
  });

  it('calls onCreateList when creating a new list', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn();

    renderCustomLists([], [], onCreateList);

    await user.click(screen.getByRole('button', { name: /Create New List/i }));
    await user.type(screen.getByPlaceholderText('e.g., Sci-Fi Masterpieces'), 'My List');
    await user.type(screen.getByPlaceholderText('Describe this list...'), 'List description');
    await user.click(screen.getByRole('button', { name: 'Create List' }));

    expect(onCreateList).toHaveBeenCalledWith('My List', 'List description');
  });

  it('calls onDeleteList when deleting a list', async () => {
    const user = userEvent.setup();
    const onDeleteList = vi.fn();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists([], lists, vi.fn(), onDeleteList);

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons[buttons.length - 1]; // Last button is delete
    await user.click(deleteButton);

    expect(onDeleteList).toHaveBeenCalledWith('list-1');
  });

  it('shows list details when View button is clicked', async () => {
    const user = userEvent.setup();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi Films', description: 'Great films', movieIds: [] },
    ];

    renderCustomLists([], lists);

    await user.click(screen.getByRole('button', { name: /View/i }));

    expect(screen.getByRole('heading', { name: 'Sci-Fi Films' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Movies in List (0)' })).toBeInTheDocument();
  });

  it('displays movies in selected list', async () => {
    const user = userEvent.setup();
    const movies: MovieLog[] = [
      { id: 'm1', movieName: 'Arrival', watchDate: '2026-01-01', frames: [], rating: 5 },
      { id: 'm2', movieName: 'Interstellar', watchDate: '2026-01-02', frames: [], rating: 4 },
    ];
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi', description: 'Desc', movieIds: ['m1'] },
    ];

    renderCustomLists(movies, lists);

    await user.click(screen.getByRole('button', { name: /View/i }));

    expect(screen.getByRole('heading', { name: 'Movies in List (1)' })).toBeInTheDocument();
    expect(screen.getAllByText('Arrival')[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Movies' })).toBeInTheDocument();
  });

  it('calls onAddMovieToList when adding a movie', async () => {
    const user = userEvent.setup();
    const onAddMovieToList = vi.fn();
    const movies: MovieLog[] = [
      { id: 'm1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 5 },
    ];
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists(movies, lists, vi.fn(), vi.fn(), onAddMovieToList);

    await user.click(screen.getByRole('button', { name: /View/i }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddMovieToList).toHaveBeenCalledWith('list-1', 'm1');
  });

  it('calls onRemoveMovieFromList when removing a movie', async () => {
    const user = userEvent.setup();
    const onRemoveMovieFromList = vi.fn();
    const movies: MovieLog[] = [
      { id: 'm1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 5 },
    ];
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: ['m1'] },
    ];

    renderCustomLists(movies, lists, vi.fn(), vi.fn(), vi.fn(), onRemoveMovieFromList);

    await user.click(screen.getByRole('button', { name: /View/i }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemoveMovieFromList).toHaveBeenCalledWith('list-1', 'm1');
  });

  it('navigates back to diary when Back button is clicked', async () => {
    const user = userEvent.setup();
    renderCustomLists();

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('shows message when no movies logged and list is selected', async () => {
    const user = userEvent.setup();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists([], lists);

    await user.click(screen.getByRole('button', { name: /View/i }));

    expect(
      screen.getByText('No movies logged yet. Add some movies to your diary to add them to lists!')
    ).toBeInTheDocument();
  });

  it('allows toggling form visibility', async () => {
    const user = userEvent.setup();

    renderCustomLists();

    expect(screen.queryByPlaceholderText('e.g., Sci-Fi Masterpieces')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create New List/i }));
    expect(screen.getByPlaceholderText('e.g., Sci-Fi Masterpieces')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('e.g., Sci-Fi Masterpieces')).not.toBeInTheDocument();
  });
});

