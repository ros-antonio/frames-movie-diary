import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { MovieLog } from './types';
import { LandingPage } from './components/LandingPage';
import { MovieDiary } from './components/MovieDiary';
import { LogNewMovie } from './components/LogNewMovie';
import { MovieDetail } from './components/MovieDetail';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';

type MovieInput = { movieName: string; watchDate: string; rating?: number; review?: string; movieLink?: string };

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
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>([]);
  const navigate = useNavigate();

  const handleAddMovie = (newMovie: MovieInput) => {
    const movie: MovieLog = {
      ...newMovie,
      id: crypto.randomUUID(),
      frames: []
    };
    setMovieLogs((prev) => [movie, ...prev]);
  };

  const handleUpdateMovie = (movieId: string, updatedMovieData: MovieInput) => {
    setMovieLogs((prev) =>
        prev.map((log) => {
          if (log.id === movieId) {
            return { ...log, ...updatedMovieData };
          }
          return log;
        })
    );
  };

  const handleDeleteMovie = (id: string) => {
    setMovieLogs((prev) => prev.filter((movie) => movie.id !== id));
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/diary"
        element={
          <DiaryRoute
            movieLogs={movieLogs}
            onAddClick={() => navigate('/diary/new')}
            onSelectMovie={(id) => navigate(`/diary/${id}`)}
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