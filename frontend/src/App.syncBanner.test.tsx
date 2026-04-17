import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const syncPendingOperationsMock = vi.fn().mockResolvedValue(true);

vi.mock('./hooks/useUserActivity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useUserActivity')>();
  return {
    ...actual,
    useUserActivity: () => ({
      logActivity: vi.fn(),
    }),
  };
});

vi.mock('./hooks/useAppState', () => ({
  useAppState: () => ({
    movieLogs: [],
    customLists: [],
    isOffline: false,
    pendingSyncCount: 2,
    operationError: null,
    clearOperationError: vi.fn(),
    syncPendingOperations: syncPendingOperationsMock,
    refreshFromServer: vi.fn(),
    handleAddMovie: vi.fn(),
    handleUpdateMovie: vi.fn(),
    handleDeleteMovie: vi.fn(),
    handleCreateList: vi.fn(),
    handleDeleteList: vi.fn(),
    handleAddMovieToList: vi.fn(),
    handleRemoveMovieFromList: vi.fn(),
    handleAddFrameToMovie: vi.fn(),
    handleDeleteFrameFromMovie: vi.fn(),
  }),
}));

describe('App sync banner', () => {
  it('runs sync action when clicking Sync now in pending banner', async () => {
    syncPendingOperationsMock.mockClear();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/diary']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Sync now/i }));

    await waitFor(() => {
      expect(syncPendingOperationsMock).toHaveBeenCalledTimes(1);
    });
  });
});

