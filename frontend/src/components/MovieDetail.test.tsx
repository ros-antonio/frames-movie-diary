import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovieDetail } from './MovieDetail';
import type { MovieLog } from '../types';

const baseMovie: MovieLog = {
  id: 'movie-1',
  movieName: 'Arrival',
  watchDate: '2026-01-01',
  frames: [],
};

describe('MovieDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders unrated state when rating is missing', () => {
    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onAddFrame={vi.fn()} />);

    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('calls onBack and onEdit from action buttons', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onEdit = vi.fn();

    render(
      <MovieDetail movie={{ ...baseMovie, rating: 4 }} onBack={onBack} onDelete={vi.fn()} onEdit={onEdit} onAddFrame={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));
    await user.click(screen.getByTitle('Edit Movie'));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('calls onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} onAddFrame={vi.fn()} />);

    await user.click(screen.getByTitle('Delete Movie'));

    expect(onDelete).toHaveBeenCalledWith('movie-1');
  });

  it('opens the capture modal from Capture New Frame', async () => {
    const user = userEvent.setup();

    render(
      <MovieDetail
        movie={{ ...baseMovie, movieLink: 'https://cdn.example.com/arrival.mp4' }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Capture New Frame/i }));

    expect(screen.getByRole('heading', { name: 'Capture Frames' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://cdn.example.com/arrival.mp4')).toBeInTheDocument();
  });

  it('renders movie link when provided', () => {
    render(
      <MovieDetail
        movie={{ ...baseMovie, movieLink: 'https://cdn.example.com/amelie.mp4' }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'https://cdn.example.com/amelie.mp4' })).toBeInTheDocument();
  });

  it('opens add-to-list modal and calls onAddMovieToList', async () => {
    const user = userEvent.setup();
    const onAddMovieToList = vi.fn();

    render(
      <MovieDetail
        movie={baseMovie}
        customLists={[
          { id: 'list-1', name: 'Favorites', description: 'Top picks', movieIds: [] },
          { id: 'list-2', name: 'Watched', description: 'Already there', movieIds: ['movie-1'] },
        ]}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
        onAddMovieToList={onAddMovieToList}
      />,
    );

    await user.click(screen.getByTitle('Add to Custom List'));
    expect(screen.getByRole('heading', { name: 'Add to Custom List' })).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getAllByText('Watched')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddMovieToList).toHaveBeenCalledWith('list-1', 'movie-1');
  });

  it('shows which custom lists already contain the movie', () => {
    render(
      <MovieDetail
        movie={baseMovie}
        customLists={[
          { id: 'list-1', name: 'Favorites', description: 'Top picks', movieIds: ['movie-1'] },
          { id: 'list-2', name: 'Weekend', description: 'For Saturday', movieIds: ['movie-1', 'movie-2'] },
          { id: 'list-3', name: 'Watch Later', description: 'Not this one', movieIds: [] },
        ]}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
      />,
    );

    expect(screen.getByText('In Custom Lists')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Weekend')).toBeInTheDocument();
    expect(screen.queryByText('Watch Later')).not.toBeInTheDocument();
  });

  it('shows an empty custom-list state when the movie is not in any list', () => {
    render(
      <MovieDetail
        movie={baseMovie}
        customLists={[
          { id: 'list-1', name: 'Watch Later', description: 'Not this one', movieIds: [] },
        ]}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
      />,
    );

    expect(screen.getByText('Not added to any custom list yet.')).toBeInTheDocument();
  });

  it('opens upload modal and validates required fields', async () => {
    const user = userEvent.setup();

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onAddFrame={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Upload PNG Frame/i }));
    expect(screen.getByRole('heading', { name: 'Upload PNG Frame' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Frame' }));

    expect(screen.getByText('PNG image is required')).toBeInTheDocument();
    expect(screen.getByText('Timestamp is required')).toBeInTheDocument();
    expect(screen.getByText('Caption is required')).toBeInTheDocument();
  });

  it('rejects oversized PNG uploads before submitting', async () => {
    const user = userEvent.setup();

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onAddFrame={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Upload PNG Frame/i }));

    const file = new File([new Uint8Array(6 * 1024 * 1024 + 1)], 'too-large.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('PNG Screenshot') as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.type(screen.getByLabelText('Timestamp (HH:MM or HH:MM:SS)'), '00:12:34');
    await user.type(screen.getByLabelText('Caption'), 'Frame caption');
    await user.click(screen.getByRole('button', { name: 'Save Frame' }));

    expect(screen.getByText('PNG image must be 6 MB or smaller')).toBeInTheDocument();
  });

  it('submits uploaded frame details to onAddFrame', async () => {
    const user = userEvent.setup();
    const onAddFrame = vi.fn();

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onAddFrame={onAddFrame} />);

    await user.click(screen.getByRole('button', { name: /Upload PNG Frame/i }));

    const file = new File(['png-image'], 'scene.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('PNG Screenshot') as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.type(screen.getByLabelText('Timestamp (HH:MM or HH:MM:SS)'), '00:12:34');
    await user.type(screen.getByLabelText('Caption'), 'Best scene');
    await user.click(screen.getByRole('button', { name: 'Save Frame' }));

    await waitFor(() => {
      expect(onAddFrame).toHaveBeenCalledOnce();
    });

    expect(onAddFrame).toHaveBeenCalledWith(
      'movie-1',
      expect.objectContaining({
        timestamp: '00:12:34',
        caption: 'Best scene',
      }),
    );
    expect(onAddFrame.mock.calls[0][1].imageUrl).toContain('data:image/png;base64,');
  });

  it('captures the current video frame and saves it with caption', async () => {
    const user = userEvent.setup();
    const onAddFrame = vi.fn().mockResolvedValue(true);
    const drawImage = vi.fn();
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,CAPTURED');

    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
      configurable: true,
      get: () => 4,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 1280,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 720,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
      configurable: true,
      get: () => 95,
    });

    render(
      <MovieDetail
        movie={{ ...baseMovie, movieLink: 'https://cdn.example.com/arrival.mp4' }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={onAddFrame}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Capture New Frame/i }));
    await user.type(screen.getByLabelText('FRAME CAPTION'), 'Hallway composition');
    await user.click(screen.getByRole('button', { name: 'Save Frame' }));

    await waitFor(() => {
      expect(onAddFrame).toHaveBeenCalledWith('movie-1', {
        imageUrl: 'data:image/png;base64,CAPTURED',
        timestamp: '01:35',
        caption: 'Hallway composition',
      });
    });

    expect(getContextSpy).toHaveBeenCalled();
    expect(toDataUrlSpy).toHaveBeenCalledWith('image/png');
    expect(drawImage).toHaveBeenCalled();
  });

  it('opens and closes frame preview when clicking a saved frame', async () => {
    const user = userEvent.setup();

    render(
      <MovieDetail
        movie={{
          ...baseMovie,
          frames: [
            {
              id: 'frame-1',
              imageUrl: 'data:image/png;base64,AAAA',
              timestamp: '00:10:12',
              caption: 'Landing shot',
            },
          ],
        }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Open frame preview: Landing shot/i }));
    expect(screen.getByRole('dialog', { name: 'Frame preview' })).toBeInTheDocument();
    expect(screen.getByText('Timestamp: 00:10:12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Frame preview' })).not.toBeInTheDocument();
  });

  it('deletes a saved frame when confirmed', async () => {
    const user = userEvent.setup();
    const onDeleteFrame = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MovieDetail
        movie={{
          ...baseMovie,
          frames: [
            {
              id: 'frame-42',
              imageUrl: 'data:image/png;base64,AAAA',
              timestamp: '00:11:11',
              caption: 'Delete me',
            },
          ],
        }}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onAddFrame={vi.fn()}
        onDeleteFrame={onDeleteFrame}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Frame' }));

    expect(onDeleteFrame).toHaveBeenCalledWith('movie-1', 'frame-42');
  });
});

