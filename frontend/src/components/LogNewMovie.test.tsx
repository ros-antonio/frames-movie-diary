import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogNewMovie } from './LogNewMovie';

describe('LogNewMovie', () => {
  it('submits a valid movie and keeps rating optional', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    const { container } = render(<LogNewMovie onSave={onSave} onCancel={vi.fn()} />);

    const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    const reviewInput = container.querySelector('textarea') as HTMLTextAreaElement;

    await user.clear(titleInput);
    await user.type(titleInput, 'Tenet');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-03-24');
    await user.type(reviewInput, 'Mind-bending thriller');

    await user.click(screen.getByRole('button', { name: /Save Movie/i }));

    expect(onSave).toHaveBeenCalledWith({
      movieName: 'Tenet',
      watchDate: '2026-03-24',
      rating: undefined,
      review: 'Mind-bending thriller',
    });
  });

  it('does not submit when rating is below 0.5', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    const { container } = render(<LogNewMovie onSave={onSave} onCancel={vi.fn()} />);

    const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    const ratingInput = container.querySelector('input[type="number"]') as HTMLInputElement;

    await user.clear(titleInput);
    await user.type(titleInput, 'Memento');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-03-24');
    await user.clear(ratingInput);
    await user.type(ratingInput, '0');

    await user.click(screen.getByRole('button', { name: /Save Movie/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<LogNewMovie onSave={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});

