import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomLists } from './CustomLists';
import type { MovieLog } from '../types';
import type { CustomList } from '../types.ts';

function renderCustomLists(
  movieLogs: MovieLog[] = [],
  customLists: CustomList[] = [],
  onCreateList = vi.fn(),
  onUpdateList = vi.fn(),
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
          element={(
            <CustomLists
              movieLogs={movieLogs}
              customLists={customLists}
              onCreateList={onCreateList}
              onUpdateList={onUpdateList}
              onDeleteList={onDeleteList}
              onAddMovieToList={onAddMovieToList}
              onRemoveMovieFromList={onRemoveMovieFromList}
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomLists', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Custom Lists heading', () => {
    renderCustomLists();

    expect(screen.getByRole('heading', { name: 'Custom Lists' })).toBeInTheDocument();
  });

  it('shows empty state when no lists exist', () => {
    renderCustomLists();

    expect(screen.getByText('No custom lists created yet. Click "Create New List" to get started!')).toBeInTheDocument();
    expect(screen.getByText(/Create your first list to start grouping movies/i)).toBeInTheDocument();
  });

  it('shows the first list as the active workspace by default', () => {
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi', description: 'Science fiction films', movieIds: [] },
      { id: 'list-2', name: 'Comedy', description: 'Funny films', movieIds: [] },
    ];

    renderCustomLists([], lists);

    expect(screen.getByRole('heading', { name: 'Sci-Fi' })).toBeInTheDocument();
    expect(screen.getAllByText('Science fiction films')).toHaveLength(2);
  });

  it('changes the active list when a different list card is clicked', async () => {
    const user = userEvent.setup();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi', description: 'Science fiction films', movieIds: [] },
      { id: 'list-2', name: 'Comedy', description: 'Funny films', movieIds: [] },
    ];

    renderCustomLists([], lists);

    await user.click(screen.getByRole('button', { name: /Comedy Funny films/i }));

    expect(screen.getByRole('heading', { name: 'Comedy' })).toBeInTheDocument();
    expect(screen.getAllByText('Funny films')).toHaveLength(2);
  });

  it('filters the list sidebar using the list search input', async () => {
    const user = userEvent.setup();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi', description: 'Science fiction films', movieIds: [] },
      { id: 'list-2', name: 'Comedy', description: 'Funny films', movieIds: [] },
    ];

    renderCustomLists([], lists);

    await user.type(screen.getByRole('searchbox', { name: 'Search lists' }), 'comedy');

    expect(screen.getByRole('button', { name: /Comedy Funny films/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sci-Fi Science fiction films/i })).not.toBeInTheDocument();
  });

  it('calls onCreateList when creating a new list', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn();

    renderCustomLists([], [], onCreateList);

    await user.click(screen.getByRole('button', { name: /Create New List/i }));
    await user.type(screen.getByPlaceholderText('e.g., Sci-Fi Masterpieces'), 'My List');
    await user.type(screen.getByPlaceholderText('What ties these movies together?'), 'List description');
    await user.click(screen.getByRole('button', { name: 'Create List' }));

    expect(onCreateList).toHaveBeenCalledWith('My List', 'List description');
  });

  it('calls onUpdateList when editing a list', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn();
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists([], lists, vi.fn(), onUpdateList);

    await user.click(screen.getByRole('button', { name: 'Edit List' }));
    await user.clear(screen.getByLabelText('List Name'));
    await user.type(screen.getByLabelText('List Name'), 'Updated List');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated description');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onUpdateList).toHaveBeenCalledWith('list-1', 'Updated List', 'Updated description');
  });

  it('calls onDeleteList when deleting the selected list after confirmation', async () => {
    const user = userEvent.setup();
    const onDeleteList = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => true));
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists([], lists, vi.fn(), vi.fn(), onDeleteList);

    await user.click(screen.getByRole('button', { name: 'Delete List' }));

    expect(onDeleteList).toHaveBeenCalledWith('list-1');
  });

  it('displays movies in selected list', () => {
    const movies: MovieLog[] = [
      { id: 'm1', movieName: 'Arrival', watchDate: '2026-01-01', frames: [], rating: 5 },
      { id: 'm2', movieName: 'Interstellar', watchDate: '2026-01-02', frames: [], rating: 4 },
    ];
    const lists: CustomList[] = [
      { id: 'list-1', name: 'Sci-Fi', description: 'Desc', movieIds: ['m1'] },
    ];

    renderCustomLists(movies, lists);

    expect(screen.getByRole('heading', { name: 'Movies in This List' })).toBeInTheDocument();
    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add from Diary' })).toBeInTheDocument();
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

    renderCustomLists(movies, lists, vi.fn(), vi.fn(), vi.fn(), onAddMovieToList);

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddMovieToList).toHaveBeenCalledWith('list-1', 'm1');
  });

  it('filters the movie workspace using the movie search input', async () => {
    const user = userEvent.setup();
    const movies: MovieLog[] = [
      { id: 'm1', movieName: 'Arrival', watchDate: '2026-01-01', frames: [], rating: 5 },
      { id: 'm2', movieName: 'Blade Runner', watchDate: '2026-01-02', frames: [], rating: 5 },
    ];
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: ['m1'] },
    ];

    renderCustomLists(movies, lists);

    await user.type(screen.getByRole('searchbox', { name: 'Search movies in list workspace' }), 'blade');

    expect(screen.queryByText('Arrival')).not.toBeInTheDocument();
    expect(screen.getByText('Blade Runner')).toBeInTheDocument();
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

    renderCustomLists(movies, lists, vi.fn(), vi.fn(), vi.fn(), vi.fn(), onRemoveMovieFromList);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemoveMovieFromList).toHaveBeenCalledWith('list-1', 'm1');
  });

  it('navigates back to diary when Back button is clicked', async () => {
    const user = userEvent.setup();
    renderCustomLists();

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('shows message when no movies logged and list is selected', () => {
    const lists: CustomList[] = [
      { id: 'list-1', name: 'My List', description: 'Desc', movieIds: [] },
    ];

    renderCustomLists([], lists);

    expect(
      screen.getByText('No movies logged yet. Add some movies to your diary to build lists.'),
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
