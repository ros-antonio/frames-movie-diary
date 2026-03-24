import { useState } from 'react';
import type { MovieLog } from './types';
import { LandingPage } from './components/LandingPage';
import { MovieDiary } from './components/MovieDiary';
import { LogNewMovie } from './components/LogNewMovie';
import { MovieDetail } from './components/MovieDetail';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [isEditingMovie, setIsEditingMovie] = useState(false);
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const handleAddMovie = (newMovie: { movieName: string; watchDate: string; rating?: number; review?: string }) => {
    const movie: MovieLog = {
      ...newMovie,
      id: crypto.randomUUID(),
      frames: []
    };
    setMovieLogs((prev) => [movie, ...prev]);
    setIsAddingMovie(false);
  };

  const handleUpdateMovie = (updatedMovieData: { movieName: string; watchDate: string; rating?: number; review?: string }) => {
    if (!selectedMovieId) return;

    setMovieLogs((prev) =>
        prev.map((log) => {
          if (log.id === selectedMovieId) {
            return { ...log, ...updatedMovieData };
          }
          return log;
        })
    );
    setIsEditingMovie(false);
  };

  const handleDeleteMovie = (id: string) => {
    setMovieLogs((prev) => prev.filter((movie) => movie.id !== id));
    setSelectedMovieId(null);
  };

  if (!hasEntered) {
    return <LandingPage onEnter={() => setHasEntered(true)} />;
  }

  if (isAddingMovie) {
    return <LogNewMovie onSave={handleAddMovie} onCancel={() => setIsAddingMovie(false)} />;
  }

  if (selectedMovieId) {
    const selectedMovie = movieLogs.find(m => m.id === selectedMovieId);

    if (!selectedMovie) {
      setSelectedMovieId(null);
      return null;
    }

    if (isEditingMovie) {
      return (
          <LogNewMovie
              initialData={selectedMovie}
              onSave={handleUpdateMovie}
              onCancel={() => setIsEditingMovie(false)}
          />
      );
    }

    return (
        <MovieDetail
            movie={selectedMovie}
            onBack={() => setSelectedMovieId(null)}
            onDelete={handleDeleteMovie}
            onEdit={() => setIsEditingMovie(true)}
        />
    );
  }

  return (
      <div className="min-h-screen bg-[#261834]">
        <MovieDiary
            movieLogs={movieLogs}
            onAddClick={() => setIsAddingMovie(true)}
            onSelectMovie={(id) => setSelectedMovieId(id)}
        />
      </div>
  );
}