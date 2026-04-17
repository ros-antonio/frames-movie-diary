import { render, screen, waitFor } from '@testing-library/react';
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

  it('shows feature alert when clicking Capture New Frame', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    render(<MovieDetail movie={baseMovie} onBack={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onAddFrame={vi.fn()} />);

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
        onAddFrame={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'magnet:?xt=urn:btih:aabbcc' })).toBeInTheDocument();
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

