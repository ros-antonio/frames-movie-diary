import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { MovieInput, MovieLog, SavedFrame } from './types';
import { LandingPage } from './components/LandingPage';
import { MovieDiary } from './components/MovieDiary';
import { LogNewMovie } from './components/LogNewMovie';
import { MovieDetail } from './components/MovieDetail';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Statistics } from './components/Statistics';
import { CustomLists } from './components/CustomLists';
import { useAppState } from './hooks/useAppState';
import { useUserActivity } from './hooks/useUserActivity';

function DiaryRoute({ movieLogs, onAddClick, onSelectMovie }: {
  movieLogs: MovieLog[];
  onAddClick: () => void;
  onSelectMovie: (id: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[#261834]">
      <MovieDiary movieLogs={movieLogs} onAddClick={onAddClick} onSelectMovie={onSelectMovie} />
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
  const movie = movieLogs.find((item) => item.id === movieId);

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
  const movie = movieLogs.find((item) => item.id === movieId);

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
    operationError,
    clearOperationError,
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

  return (
    <>
      {operationError && (
        <div className="fixed left-1/2 top-4 z-50 w-[min(90vw,42rem)] -translate-x-1/2 rounded-lg border border-red-500/60 bg-red-900/90 px-4 py-3 text-sm text-red-100 shadow-lg">
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
      <Route path="/statistics" element={<Statistics movieLogs={movieLogs} />} />
      <Route
        path="/custom-lists"
        element={
          <CustomLists
            movieLogs={movieLogs}
            customLists={customLists}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onAddMovieToList={handleAddMovieToList}
            onRemoveMovieFromList={handleRemoveMovieFromList}
          />
        }
      />
      <Route
        path="/diary"
        element={
          <DiaryRoute
            movieLogs={movieLogs}
            onAddClick={() => navigate('/diary/new')}
            onSelectMovie={(id) => {
              logActivity({ eventType: 'view', movieId: id, pageRoute: '/diary' });
              navigate(`/diary/${id}`);
            }}
          />
        }
      />
      <Route path="/diary/new" element={<AddMovieRoute onSave={handleAddMovie} />} />
      <Route
        path="/diary/:movieId"
        element={
          <MovieDetailRoute
            movieLogs={movieLogs}
            onDelete={handleDeleteMovie}
            onAddFrame={handleAddFrameToMovie}
            onDeleteFrame={handleDeleteFrameFromMovie}
          />
        }
      />
      <Route
        path="/diary/:movieId/edit"
        element={<EditMovieRoute movieLogs={movieLogs} onSave={handleUpdateMovie} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}