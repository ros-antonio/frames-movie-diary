import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovieForm } from './useMovieForm';

describe('useMovieForm', () => {
  it('allows quick submit with title only using default watch date', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Quick Log Movie',
      });
    });

    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        movieName: 'Quick Log Movie',
        watchDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });

  it('submits valid data and keeps rating optional', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Dune',
        watchDate: '2026-03-25',
        rating: '',
        review: 'Great visuals',
        movieLink: 'magnet:?xt=urn:btih:abc123',
      });
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleSubmit({ preventDefault } as unknown as React.SyntheticEvent);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      movieName: 'Dune',
      watchDate: '2026-03-25',
      rating: undefined,
      review: 'Great visuals',
      movieLink: 'magnet:?xt=urn:btih:abc123',
    });
  });

  it('rejects ratings below the 0.5 minimum', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Interstellar',
        watchDate: '2026-03-25',
        rating: '0',
      });
    });

    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('initializes edit form values from initialData', () => {
    const { result } = renderHook(() =>
      useMovieForm(vi.fn(), {
        id: '1',
        movieName: 'Arrival',
        watchDate: '2026-01-01',
        rating: 4.5,
        review: 'Excellent',
        movieLink: 'https://example.com/arrival',
        frames: [],
      }),
    );

    expect(result.current.formData).toEqual({
      title: 'Arrival',
      watchDate: '2026-01-01',
      rating: '4.5',
      review: 'Excellent',
      movieLink: 'https://example.com/arrival',
    });
  });

  it('does not submit when required title is missing', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: '',
        watchDate: '2026-03-25',
      });
    });

    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('falls back to today format for invalid initial watchDate', () => {
    const { result } = renderHook(() =>
      useMovieForm(vi.fn(), {
        id: '2',
        movieName: 'Unknown',
        watchDate: 'invalid-date',
        frames: [],
      }),
    );

    expect(result.current.formData.watchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.formData.watchDate).not.toBe('invalid-date');
  });

  it('normalizes parseable non-input watchDate values', () => {
    const rawDate = 'March 25, 2026 10:30:00';

    const { result } = renderHook(() =>
      useMovieForm(vi.fn(), {
        id: '3',
        movieName: 'Normalized Date',
        watchDate: rawDate,
        frames: [],
      }),
    );

    expect(result.current.formData.watchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.formData.watchDate).not.toBe(rawDate);
  });

  it('rejects missing, malformed, and future watch dates', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Date checks',
        watchDate: '',
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });
    expect(result.current.errors.watchDate).toBe('Watch date is required');

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Date checks',
        watchDate: '03/25/2026',
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });
    expect(result.current.errors.watchDate).toBe('Invalid date format');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Date checks',
        watchDate: `${yyyy}-${mm}-${dd}`,
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });
    expect(result.current.errors.watchDate).toBe('Watch date cannot be in the future');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects non-numeric and above-maximum ratings', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Rating checks',
        watchDate: '2026-03-25',
        rating: 'abc',
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });
    expect(result.current.errors.rating).toBe('Rating must be a valid number');

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Rating checks',
        watchDate: '2026-03-25',
        rating: '5.1',
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });
    expect(result.current.errors.rating).toBe('Rating cannot exceed 5 stars');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects overlong review and movie link', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useMovieForm(onSave));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        title: 'Length checks',
        watchDate: '2026-03-25',
        review: 'r'.repeat(1001),
        movieLink: `https://example.com/${'x'.repeat(1985)}`,
      });
    });
    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.SyntheticEvent);
    });

    expect(result.current.errors.review).toBe('Review must be less than 1000 characters');
    expect(result.current.errors.movieLink).toBe('Movie link must be less than 2000 characters');
    expect(onSave).not.toHaveBeenCalled();
  });
});

