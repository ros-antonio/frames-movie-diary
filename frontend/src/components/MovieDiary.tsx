import { Film, List, BarChart3, TableIcon, LayoutGrid, Plus, ArrowUpDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MovieLog } from '../types';
import { useMovieDiaryPage } from '../hooks/useMovieDiaryPage';

interface MovieDiaryProps {
    movieLogs: MovieLog[];
    onAddClick: () => void;
    onSelectMovie: (id: string) => void;
}

export function MovieDiary({ movieLogs, onAddClick, onSelectMovie }: MovieDiaryProps) {
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
    }, [hasMore, loadMore, totalMovies]);

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
        if (direction === 'none') return <ArrowUpDown className="w-4 h-4 opacity-30" />;
        return direction === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <div className="min-h-screen p-8 text-[#B9A5D2]">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <Film className="w-8 h-8" style={{ color: '#E0BAAA' }} />
                        <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>Movie Diary</h1>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={goToStatistics}
                            className="flex items-center px-4 py-2 border rounded-md border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10 transition-colors btn-press"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" /> Statistics
                        </button>
                        <button
                            onClick={goToCustomLists}
                            className="flex items-center px-4 py-2 border rounded-md border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10 transition-colors btn-press"
                        >
                            <List className="w-4 h-4 mr-2" /> Custom Lists
                        </button>
                        <button
                            onClick={onAddClick}
                            className="flex items-center px-4 py-2 rounded-md bg-[#E0BAAA] text-[#261834] font-bold hover:opacity-90 transition-opacity btn-press"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Log New Movie
                        </button>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <div className="flex gap-2 rounded-lg p-1 bg-[#223662]">
                        <button
                            aria-label="Table view"
                            onClick={() => handleViewModeChange('table')}
                            className={`p-2 rounded-md transition-all btn-press ${viewMode === 'table' ? 'bg-[#E0BAAA] text-[#261834]' : 'text-[#B9A5D2]'}`}
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                        <button
                            aria-label="Card view"
                            onClick={() => handleViewModeChange('card')}
                            className={`p-2 rounded-md transition-all btn-press ${viewMode === 'card' ? 'bg-[#E0BAAA] text-[#261834]' : 'text-[#B9A5D2]'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {viewMode === 'table' && (
                    <div className="rounded-lg overflow-hidden bg-[#223662]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="border-b border-[#B9A5D2]/20">
                                <th className="p-4 font-semibold text-[#E0BAAA]">
                                    <button
                                        onClick={() => handleSortChange('movieName')}
                                        className="flex items-center gap-2 hover:text-white transition-colors"
                                    >
                                        Movie Name {renderSortIcon('movieName')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-[#E0BAAA]">
                                    <button
                                        onClick={() => handleSortChange('watchDate')}
                                        className="flex items-center gap-2 hover:text-white transition-colors"
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
                                    className="border-b border-[#B9A5D2]/10 hover:bg-[#B9A5D2]/5 cursor-pointer transition-colors hover-lift"
                                >
                                    <td className="p-4">{movie.movieName}</td>
                                    <td className="p-4">{new Date(movie.watchDate).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {totalMovies === 0 && (
                                <tr>
                                    <td colSpan={2} className="p-8 text-center opacity-50 italic">No movies logged yet. Click "Log New Movie" to start!</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentMovies.map((movie) => (
                            <div
                                key={movie.id}
                                onClick={() => onSelectMovie(movie.id)}
                                className="rounded-lg p-6 space-y-3 cursor-pointer bg-[#223662] hover:ring-2 hover:ring-[#E0BAAA] transition-all hover-lift"
                            >
                                <div className="flex items-start justify-between">
                                    <Film className="w-6 h-6 text-[#E0BAAA]" />
                                    <span className="text-sm opacity-70">{new Date(movie.watchDate).getFullYear()}</span>
                                </div>
                                <h3 className="text-xl font-bold">{movie.movieName}</h3>
                                <div className="pt-2 border-t border-[#B9A5D2]/20">
                                    <p style={{ color: '#E0BAAA' }}>{new Date(movie.watchDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(totalMovies > 0 || hasMore) && (
                    <div className="pt-4 space-y-3">
                        {hasMore ? (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={loadMore}
                                    className="px-4 py-2 rounded-md border border-[#B9A5D2]/50 hover:bg-[#B9A5D2]/10"
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
                        className="fixed bottom-6 right-6 z-40 rounded-full p-3 bg-[#E0BAAA] text-[#261834] shadow-lg hover:opacity-90"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}