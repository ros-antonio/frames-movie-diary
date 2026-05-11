import { ArrowUp, ArrowUpDown, BarChart3, Film, LayoutGrid, List, Plus, Shield, TableIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { MovieLog } from '../types';
import { useMovieDiaryPage } from '../hooks/useMovieDiaryPage';

interface MovieDiaryProps {
  movieLogs: MovieLog[];
  onAddClick: () => void;
  onSelectMovie: (id: string) => void;
  onAdminClick?: () => void;
  userRole?: string | null;
  accountMenu?: ReactNode;
}

export function MovieDiary({
  movieLogs,
  onAddClick,
  onSelectMovie,
  onAdminClick,
  userRole,
  accountMenu,
}: MovieDiaryProps) {
  const {
    viewMode,
    currentMovies,
    hasMore,
    loadMore,
    totalMovies,
    handleViewModeChange,
    handleSortChange,
    getSortDirection,
    goToStatistics,
    goToCustomLists,
  } = useMovieDiaryPage(movieLogs);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToTop, setShowJumpToTop] = useState(false);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '480px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  useEffect(() => {
    const onScroll = () => {
      setShowJumpToTop(window.scrollY > 550);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const renderSortIcon = (field: 'movieName' | 'watchDate') => {
    const direction = getSortDirection(field);

    if (direction === 'none') {
      return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    }

    return <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="min-h-screen p-8 text-[#B9A5D2]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <Film className="h-8 w-8" style={{ color: '#E0BAAA' }} />
            <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>
              Movie Diary
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {userRole === 'ADMIN' && onAdminClick && (
              <button
                onClick={onAdminClick}
                className="btn-press flex items-center rounded-md border border-[#B9A5D2] px-4 py-2 text-[#B9A5D2] transition-colors hover:bg-[#B9A5D2]/10"
              >
                <Shield className="mr-2 h-4 w-4" /> Admin
              </button>
            )}
            <button
              onClick={goToStatistics}
              className="btn-press flex items-center rounded-md border border-[#E0BAAA] px-4 py-2 text-[#E0BAAA] transition-colors hover:bg-[#E0BAAA]/10"
            >
              <BarChart3 className="mr-2 h-4 w-4" /> Statistics
            </button>
            <button
              onClick={goToCustomLists}
              className="btn-press flex items-center rounded-md border border-[#E0BAAA] px-4 py-2 text-[#E0BAAA] transition-colors hover:bg-[#E0BAAA]/10"
            >
              <List className="mr-2 h-4 w-4" /> Custom Lists
            </button>
            <button
              onClick={onAddClick}
              className="btn-press flex items-center rounded-md bg-[#E0BAAA] px-4 py-2 font-bold text-[#261834] transition-opacity hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" /> Log New Movie
            </button>
            {accountMenu}
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <div className="flex gap-2 rounded-lg bg-[#223662] p-1">
            <button
              aria-label="Table view"
              onClick={() => handleViewModeChange('table')}
              className={`btn-press rounded-md p-2 transition-all ${viewMode === 'table' ? 'bg-[#E0BAAA] text-[#261834]' : 'text-[#B9A5D2]'}`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              aria-label="Card view"
              onClick={() => handleViewModeChange('card')}
              className={`btn-press rounded-md p-2 transition-all ${viewMode === 'card' ? 'bg-[#E0BAAA] text-[#261834]' : 'text-[#B9A5D2]'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewMode === 'table' && (
          <div className="overflow-hidden rounded-lg bg-[#223662]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#B9A5D2]/20">
                  <th className="p-4 font-semibold text-[#E0BAAA]">
                    <button
                      onClick={() => handleSortChange('movieName')}
                      className="flex items-center gap-2 transition-colors hover:text-white"
                    >
                      Movie Name {renderSortIcon('movieName')}
                    </button>
                  </th>
                  <th className="p-4 font-semibold text-[#E0BAAA]">
                    <button
                      onClick={() => handleSortChange('watchDate')}
                      className="flex items-center gap-2 transition-colors hover:text-white"
                    >
                      Watch Date {renderSortIcon('watchDate')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentMovies.map((movie) => (
                  <tr
                    key={movie.id}
                    onClick={() => onSelectMovie(movie.id)}
                    className="cursor-pointer border-b border-[#B9A5D2]/10 transition-colors hover:bg-[#B9A5D2]/5 hover-lift"
                  >
                    <td className="p-4">{movie.movieName}</td>
                    <td className="p-4">{new Date(movie.watchDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                {totalMovies === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center italic opacity-50">
                      No movies logged yet. Click "Log New Movie" to start!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'card' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie.id)}
                className="hover-lift cursor-pointer space-y-3 rounded-lg bg-[#223662] p-6 transition-all hover:ring-2 hover:ring-[#E0BAAA]"
              >
                <div className="flex items-start justify-between">
                  <Film className="h-6 w-6 text-[#E0BAAA]" />
                  <span className="text-sm opacity-70">{new Date(movie.watchDate).getFullYear()}</span>
                </div>
                <h3 className="text-xl font-bold">{movie.movieName}</h3>
                <div className="border-t border-[#B9A5D2]/20 pt-2">
                  <p style={{ color: '#E0BAAA' }}>{new Date(movie.watchDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(totalMovies > 0 || hasMore) && (
          <div className="space-y-3 pt-4">
            {hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-md border border-[#B9A5D2]/50 px-4 py-2 hover:bg-[#B9A5D2]/10"
                >
                  Load more movies
                </button>
              </div>
            ) : (
              totalMovies > 0 && <p className="text-center text-xs opacity-80">You reached the end.</p>
            )}
          </div>
        )}

        <div ref={sentinelRef} className="h-2" aria-hidden="true" />

        {showJumpToTop && (
          <button
            type="button"
            aria-label="Jump to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 rounded-full bg-[#E0BAAA] p-3 text-[#261834] shadow-lg hover:opacity-90"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
