import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { MovieInput, MovieLog } from './types';
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

function AddMovieRoute({ onSave }: { onSave: (newMovie: MovieInput) => void }) {
  const navigate = useNavigate();

  return (
    <LogNewMovie
      onSave={(newMovie) => {
        onSave(newMovie);
        navigate('/diary');
      }}
      onCancel={() => navigate('/diary')}
    />
  );
}

function MovieDetailRoute({ movieLogs, onDelete }: { movieLogs: MovieLog[]; onDelete: (id: string) => void }) {
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
      onDelete={(id) => {
        onDelete(id);
        navigate('/diary');
      }}
      onEdit={() => navigate(`/diary/${movie.id}/edit`)}
    />
  );
}

function EditMovieRoute({ movieLogs, onSave }: { movieLogs: MovieLog[]; onSave: (id: string, updatedMovie: MovieInput) => void }) {
  const navigate = useNavigate();
  const { movieId } = useParams();
  const movie = movieLogs.find((item) => item.id === movieId);

  if (!movie) {
    return <Navigate to="/diary" replace />;
  }

  return (
    <LogNewMovie
      initialData={movie}
      onSave={(updatedMovie) => {
        onSave(movie.id, updatedMovie);
        navigate(`/diary/${movie.id}`);
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
    handleAddMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleCreateList,
    handleDeleteList,
    handleAddMovieToList,
    handleRemoveMovieFromList,
  } = useAppState();

  return (
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
      <Route path="/diary/:movieId" element={<MovieDetailRoute movieLogs={movieLogs} onDelete={handleDeleteMovie} />} />
      <Route
        path="/diary/:movieId/edit"
        element={<EditMovieRoute movieLogs={movieLogs} onSave={handleUpdateMovie} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}