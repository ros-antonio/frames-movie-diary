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

  it('rejects empty list name when creating', async () => {
    const onCreateList = vi.fn();
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList,
        onUpdateList: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setNewListName('   ');
      await result.current.handleCreateList({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.name).toBe('List name is required');
    expect(onCreateList).not.toHaveBeenCalled();
  });

  it('rejects too long list name and description when creating', async () => {
    const onCreateList = vi.fn();
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList,
        onUpdateList: vi.fn(),
      }),
    );

    act(() => {
      result.current.setNewListName('a'.repeat(101));
      result.current.setNewListDescription('d'.repeat(501));
    });

    await act(async () => {
      await result.current.handleCreateList({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.errors.name).toBe('List name must be less than 100 characters');
    expect(result.current.errors.description).toBe('Description must be less than 500 characters');
    expect(onCreateList).not.toHaveBeenCalled();
  });

  it('selects the first available list by default', () => {
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [
          { id: 'list-1', name: 'Favorites', description: '', movieIds: [] },
          { id: 'list-2', name: 'Watch later', description: '', movieIds: [] },
        ],
        onCreateList: vi.fn(),
        onUpdateList: vi.fn(),
      }),
    );

    expect(result.current.selectedList?.id).toBe('list-1');
  });

  it('loads edit state from the selected list', () => {
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [
          { id: 'list-1', name: 'Favorites', description: 'Best of the best', movieIds: [] },
        ],
        onCreateList: vi.fn(),
        onUpdateList: vi.fn(),
      }),
    );

    act(() => {
      result.current.beginEdit();
    });

    expect(result.current.editingListId).toBe('list-1');
    expect(result.current.editingName).toBe('Favorites');
    expect(result.current.editingDescription).toBe('Best of the best');
  });

  it('navigates back to diary', () => {
    const { result } = renderHook(() =>
      useCustomLists({
        movieLogs: [],
        customLists: [],
        onCreateList: vi.fn(),
        onUpdateList: vi.fn(),
      }),
    );

    act(() => {
      result.current.goBackToDiary();
    });

    expect(navigateSpy).toHaveBeenCalledWith('/diary');
  });
});
