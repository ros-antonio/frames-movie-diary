import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MovieInput, MovieLog, SavedFrame } from './types';
import { AccountMenu } from './components/AccountMenu';
import { LandingPage } from './components/LandingPage';
import { MovieDiary } from './components/MovieDiary';
import { LogNewMovie } from './components/LogNewMovie';
import { MovieDetail } from './components/MovieDetail';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Statistics } from './components/Statistics';
import { CustomLists } from './components/CustomLists';
import { AdminDashboard } from './components/AdminDashboard';
import { useAppState } from './hooks/useAppState';
import { useUserActivity } from './hooks/useUserActivity';
import { movieDiaryApi } from './api/movieDiaryApi';
import {
  clearSessionUser,
  dispatchSessionChanged,
  hasSessionTimedOut,
  readSessionUser,
  updateSessionActivity,
} from './utils/session';

const LOGOUT_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

function DiaryRoute({ movieLogs, onAddClick, onSelectMovie, accountMenu }: {
  movieLogs: MovieLog[];
  onAddClick: () => void;
  onSelectMovie: (id: string) => void;
  accountMenu?: ReactNode;
}) {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  return (
    <div className="min-h-screen bg-[#261834]">
      <MovieDiary
        movieLogs={movieLogs}
        onAddClick={onAddClick}
        onSelectMovie={onSelectMovie}
        onAdminClick={() => navigate('/admin')}
        userRole={userRole}
        accountMenu={accountMenu}
      />
    </div>
  );
}

function AddMovieRoute({ onSave, accountMenu }: { onSave: (newMovie: MovieInput) => Promise<boolean>; accountMenu?: ReactNode }) {
  const navigate = useNavigate();

  return (
    <LogNewMovie
      accountMenu={accountMenu}
      onSave={async (newMovie) => {
        const saved = await onSave(newMovie);
        if (saved) {
          navigate('/diary');
        }
      }}
      onCancel={() => navigate('/diary')}
    />
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('userId')) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('userId')) {
    return <Navigate to="/" replace />;
  }

  if (localStorage.getItem('userRole') !== 'ADMIN') {
    return <Navigate to="/diary" replace />;
  }

  return children;
}

function MovieDetailRoute({
  movieLogs,
  onDelete,
  onAddFrame,
  onDeleteFrame,
  accountMenu,
}: {
  movieLogs: MovieLog[];
  onDelete: (id: string) => Promise<boolean>;
  onAddFrame: (movieId: string, frameData: Omit<SavedFrame, 'id'>) => Promise<boolean>;
  onDeleteFrame: (movieId: string, frameId: string) => Promise<boolean>;
  accountMenu?: ReactNode;
}) {
  const navigate = useNavigate();
  const { movieId } = useParams();

  const [fetchedMovie, setFetchedMovie] = useState<MovieLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const globalMovie = movieLogs.find((item) => item.id === movieId);
  const movie = globalMovie || fetchedMovie;

  useEffect(() => {
    if (globalMovie) {
      setIsLoading(false);
      return;
    }

    if (import.meta.env.MODE === 'test') {
      setIsLoading(false);
      return;
    }

    async function fetchMissingMovie() {
      try {
        if (movieId) {
          const data = await movieDiaryApi.getMovie(movieId);
          setFetchedMovie(data);
        }
      } catch {
        navigate('/diary', { replace: true });
      } finally {
        setIsLoading(false);
      }
    }

    void fetchMissingMovie();
  }, [globalMovie, movieId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#261834] flex items-center justify-center text-[#B9A5D2]">
        Loading movie details...
      </div>
    );
  }

  if (!movie) {
    return <Navigate to="/diary" replace />;
  }

  return (
    <MovieDetail
      movie={movie}
      accountMenu={accountMenu}
      onBack={() => navigate('/diary')}
      onDelete={async (id) => {
        const deleted = await onDelete(id);
        if (deleted) {
          navigate('/diary');
        }
      }}
      onEdit={() => navigate(`/diary/${movie.id}/edit`)}
      onAddFrame={onAddFrame}
      onDeleteFrame={onDeleteFrame}
    />
  );
}

function EditMovieRoute({
  movieLogs,
  onSave,
  accountMenu,
}: {
  movieLogs: MovieLog[];
  onSave: (id: string, updatedMovie: MovieInput) => Promise<boolean>;
  accountMenu?: ReactNode;
}) {
  const navigate = useNavigate();
  const { movieId } = useParams();

  const [fetchedMovie, setFetchedMovie] = useState<MovieLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const globalMovie = movieLogs.find((item) => item.id === movieId);
  const movie = globalMovie || fetchedMovie;

  useEffect(() => {
    if (globalMovie) {
      setIsLoading(false);
      return;
    }

    if (import.meta.env.MODE === 'test') {
      setIsLoading(false);
      return;
    }

    async function fetchMissingMovie() {
      try {
        if (movieId) {
          const data = await movieDiaryApi.getMovie(movieId);
          setFetchedMovie(data);
        }
      } catch {
        navigate('/diary', { replace: true });
      } finally {
        setIsLoading(false);
      }
    }

    void fetchMissingMovie();
  }, [globalMovie, movieId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#261834] flex items-center justify-center text-[#B9A5D2]">
        Loading movie editor...
      </div>
    );
  }

  if (!movie) {
    return <Navigate to="/diary" replace />;
  }

  return (
    <LogNewMovie
      accountMenu={accountMenu}
      initialData={movie}
      onSave={async (updatedMovie) => {
        const saved = await onSave(movie.id, updatedMovie);
        if (saved) {
          navigate(`/diary/${movie.id}`);
        }
      }}
      onCancel={() => navigate(`/diary/${movie.id}`)}
    />
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logActivity } = useUserActivity({ trackPageVisits: true });
  const {
    movieLogs,
    customLists,
    isOffline,
    pendingSyncCount,
    operationError,
    clearOperationError,
    syncPendingOperations,
    handleAddMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleCreateList,
    handleDeleteList,
    handleAddMovieToList,
    handleRemoveMovieFromList,
    handleAddFrameToMovie,
    handleDeleteFrameFromMovie,
  } = useAppState();
  const [isSyncing, setIsSyncing] = useState(false);
  const sessionUser = readSessionUser();
  const showAccountMenu = Boolean(sessionUser) && !['/', '/login', '/register'].includes(location.pathname);
  const lastActivityWriteRef = useRef(0);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await syncPendingOperations();
    setIsSyncing(false);
  };

  const performLogout = useCallback(async (syncBackend: boolean) => {
    if (syncBackend) {
      try {
        await movieDiaryApi.logout();
      } catch {
        // Clearing local state still prevents stale sessions in the UI.
      }
    }

    clearSessionUser();
    dispatchSessionChanged(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    void performLogout(true);
  };

  useEffect(() => {
    const handleAuthExpired = () => {
      void performLogout(false);
    };

    window.addEventListener('authExpired', handleAuthExpired);
    return () => {
      window.removeEventListener('authExpired', handleAuthExpired);
    };
  }, [performLogout]);

  useEffect(() => {
    if (!sessionUser) {
      return;
    }

    if (hasSessionTimedOut()) {
      void performLogout(true);
      return;
    }

    updateSessionActivity();
    lastActivityWriteRef.current = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteRef.current < 1000) {
        return;
      }

      lastActivityWriteRef.current = now;
      updateSessionActivity(now);
    };

    const intervalId = window.setInterval(() => {
      if (hasSessionTimedOut()) {
        void performLogout(true);
      }
    }, SESSION_CHECK_INTERVAL_MS);

    for (const eventName of LOGOUT_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      window.clearInterval(intervalId);
      for (const eventName of LOGOUT_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [performLogout, sessionUser]);

  const accountMenuNode = showAccountMenu && sessionUser ? (
    <AccountMenu
      name={sessionUser.name}
      email={sessionUser.email}
      role={sessionUser.role}
      onLogout={handleLogout}
    />
  ) : undefined;

  return (
    <>
      {(isOffline || pendingSyncCount > 0) && (
        <div className="fixed left-1/2 top-4 z-50 w-[min(90vw,42rem)] -translate-x-1/2 rounded-lg border border-amber-500/60 bg-amber-900/90 px-4 py-3 text-sm text-amber-100 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <p>
              {isOffline
                ? `Offline mode enabled. Pending sync operations: ${pendingSyncCount}.`
                : `Pending sync operations: ${pendingSyncCount}.`}
            </p>
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => void handleSyncClick()}
                disabled={isSyncing}
                className="rounded bg-amber-800 px-2 py-1 text-xs font-medium hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSyncing ? 'Syncing...' : 'Sync now'}
              </button>
            )}
          </div>
        </div>
      )}
      {operationError && (
        <div className="fixed left-1/2 top-20 z-50 w-[min(90vw,42rem)] -translate-x-1/2 rounded-lg border border-red-500/60 bg-red-900/90 px-4 py-3 text-sm text-red-100 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <p>{operationError}</p>
            <button
              type="button"
              onClick={clearOperationError}
              className="rounded bg-red-800 px-2 py-1 text-xs font-medium hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={<LandingPage onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/statistics" element={<RequireAuth><Statistics movieLogs={movieLogs} accountMenu={accountMenuNode} /></RequireAuth>} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard onBack={() => navigate('/diary')} accountMenu={accountMenuNode} />
            </RequireAdmin>
          }
        />
        <Route
          path="/custom-lists"
          element={
            <RequireAuth>
              <CustomLists
                movieLogs={movieLogs}
                customLists={customLists}
                onCreateList={handleCreateList}
                onDeleteList={handleDeleteList}
                onAddMovieToList={handleAddMovieToList}
                onRemoveMovieFromList={handleRemoveMovieFromList}
                accountMenu={accountMenuNode}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/diary"
          element={
            <RequireAuth>
              <DiaryRoute
                movieLogs={movieLogs}
                accountMenu={accountMenuNode}
                onAddClick={() => navigate('/diary/new')}
                onSelectMovie={(id) => {
                  logActivity({ eventType: 'view', movieId: id, pageRoute: '/diary' });
                  navigate(`/diary/${id}`);
                }}
              />
            </RequireAuth>
          }
        />
        <Route path="/diary/new" element={<RequireAuth><AddMovieRoute onSave={handleAddMovie} accountMenu={accountMenuNode} /></RequireAuth>} />
        <Route
          path="/diary/:movieId"
          element={
            <RequireAuth>
              <MovieDetailRoute
                movieLogs={movieLogs}
                accountMenu={accountMenuNode}
                onDelete={handleDeleteMovie}
                onAddFrame={handleAddFrameToMovie}
                onDeleteFrame={handleDeleteFrameFromMovie}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/diary/:movieId/edit"
          element={<RequireAuth><EditMovieRoute movieLogs={movieLogs} onSave={handleUpdateMovie} accountMenu={accountMenuNode} /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
