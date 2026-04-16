import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomLists } from './useCustomLists';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateSpy,
}));

describe('useCustomLists validation', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
  });

  it('rejects empty list name', () => {
    const onCreateList = vi.fn();
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList,
      }),
    );

    act(() => {
      result.current.setNewListName('   ');
      result.current.handleCreateList({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.name).toBe('List name is required');
    expect(onCreateList).not.toHaveBeenCalled();
  });

  it('rejects too long list name and description', () => {
    const onCreateList = vi.fn();
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList,
      }),
    );

    act(() => {
      result.current.setNewListName('a'.repeat(101));
      result.current.setNewListDescription('d'.repeat(501));
    });

    act(() => {
      result.current.handleCreateList({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.name).toBe('List name must be less than 100 characters');
    expect(result.current.errors.description).toBe('Description must be less than 500 characters');
    expect(onCreateList).not.toHaveBeenCalled();
  });

  it('navigates back to diary', () => {
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList: vi.fn(),
      }),
    );

    act(() => {
      result.current.goBackToDiary();
    });

    expect(navigateSpy).toHaveBeenCalledWith('/diary');
  });
});

