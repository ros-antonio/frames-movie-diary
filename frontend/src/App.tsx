import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { MovieInput, MovieLog, SavedFrame } from './types';
import { LandingPage } from './components/LandingPage';
import { MovieDiary } from './components/MovieDiary';
import { LogNewMovie } from './components/LogNewMovie';
import { MovieDetail } from './components/MovieDetail';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Statistics } from './components/Statistics';
import { CustomLists } from './components/CustomLists';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatPage } from './components/ChatPage';
import { useAppState } from './hooks/useAppState';
import { useUserActivity } from './hooks/useUserActivity';
import { movieDiaryApi } from './api/movieDiaryApi';

function DiaryRoute({ movieLogs, onAddClick, onSelectMovie }: {
  movieLogs: MovieLog[];
  onAddClick: () => void;
  onSelectMovie: (id: string) => void;
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
        onChatClick={() => navigate('/chat')}
        userRole={userRole}
      />
    </div>
  );
}

function AddMovieRoute({ onSave }: { onSave: (newMovie: MovieInput) => Promise<boolean> }) {
  const navigate = useNavigate();

  return (
    <LogNewMovie
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
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('userId')) {
    return <Navigate to="/login" replace />;
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
                          }: {
  movieLogs: MovieLog[];
  onDelete: (id: string) => Promise<boolean>;
  onAddFrame: (movieId: string, frameData: Omit<SavedFrame, 'id'>) => Promise<boolean>;
  onDeleteFrame: (movieId: string, frameId: string) => Promise<boolean>;
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

function EditMovieRoute({ movieLogs, onSave }: { movieLogs: MovieLog[]; onSave: (id: string, updatedMovie: MovieInput) => Promise<boolean> }) {
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

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await syncPendingOperations();
    setIsSyncing(false);
  };

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
        <Route path="/statistics" element={<RequireAuth><Statistics movieLogs={movieLogs} /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><ChatPage onBack={() => navigate('/diary')} /></RequireAuth>} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard onBack={() => navigate('/diary')} />
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
                onAddClick={() => navigate('/diary/new')}
                onSelectMovie={(id) => {
                  logActivity({ eventType: 'view', movieId: id, pageRoute: '/diary' });
                  navigate(`/diary/${id}`);
                }}
              />
            </RequireAuth>
          }
        />
        <Route path="/diary/new" element={<RequireAuth><AddMovieRoute onSave={handleAddMovie} /></RequireAuth>} />
        <Route
          path="/diary/:movieId"
          element={
            <RequireAuth>
              <MovieDetailRoute
                movieLogs={movieLogs}
                onDelete={handleDeleteMovie}
                onAddFrame={handleAddFrameToMovie}
                onDeleteFrame={handleDeleteFrameFromMovie}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/diary/:movieId/edit"
          element={<RequireAuth><EditMovieRoute movieLogs={movieLogs} onSave={handleUpdateMovie} /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
