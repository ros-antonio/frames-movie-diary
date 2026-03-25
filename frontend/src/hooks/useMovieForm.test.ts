import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovieForm } from './useMovieForm';

describe('useMovieForm', () => {
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
        frames: [],
      }),
    );

    expect(result.current.formData).toEqual({
      title: 'Arrival',
      watchDate: '2026-01-01',
      rating: '4.5',
      review: 'Excellent',
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
});

