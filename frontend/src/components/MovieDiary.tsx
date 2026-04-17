import { Film, List, BarChart3, TableIcon, LayoutGrid, Plus, ArrowUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MovieLog } from '../types';
import { useMovieDiaryPage } from '../hooks/useMovieDiaryPage';
import type { GeneratorStatus } from '../types';
import { movieDiaryApi } from '../api/movieDiaryApi';

interface MovieDiaryProps {
    movieLogs: MovieLog[];
    onAddClick: () => void;
    onSelectMovie: (id: string) => void;
}

export function MovieDiary({ movieLogs, onAddClick, onSelectMovie }: MovieDiaryProps) {
    const {
        currentPage,
        setCurrentPage,
        viewMode,
        totalPages,
        currentMovies,
        handleViewModeChange,
        handleSortChange,
        getSortDirection,
        goToStatistics,
        goToCustomLists,
    } = useMovieDiaryPage(movieLogs);
    const [generatorStatus, setGeneratorStatus] = useState<GeneratorStatus>({
        running: false,
        batchSize: 3,
        intervalMs: 3000,
    });
    const [isGeneratorBusy, setIsGeneratorBusy] = useState(false);
    const [generatorError, setGeneratorError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadStatus = async () => {
            try {
                const status = await movieDiaryApi.getGeneratorStatus();
                if (isMounted) {
                    setGeneratorStatus(status);
                }
            } catch {
                if (isMounted) {
                    setGeneratorError('Could not load generator status.');
                }
            }
        };

        void loadStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleStartGenerator = async () => {
        setIsGeneratorBusy(true);
        setGeneratorError(null);
        try {
            const result = await movieDiaryApi.startGenerator();
            setGeneratorStatus(result.status);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setGeneratorError(error.message);
            } else {
                setGeneratorError('Could not start generator.');
            }
        } finally {
            setIsGeneratorBusy(false);
        }
    };

    const handleStopGenerator = async () => {
        setIsGeneratorBusy(true);
        setGeneratorError(null);
        try {
            const result = await movieDiaryApi.stopGenerator();
            setGeneratorStatus(result.status);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setGeneratorError(error.message);
            } else {
                setGeneratorError('Could not stop generator.');
            }
        } finally {
            setIsGeneratorBusy(false);
        }
    };


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

                <div className="rounded-lg p-4 bg-[#223662] border border-[#B9A5D2]/20">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <p className="text-sm" style={{ color: '#E0BAAA' }}>Auto Movie Generator</p>
                            <p className="text-xs opacity-80" style={{ color: '#B9A5D2' }}>
                                Status: {generatorStatus.running ? 'Running' : 'Stopped'}
                                {generatorStatus.running ? ` (${generatorStatus.batchSize} every ${Math.round(generatorStatus.intervalMs / 1000)}s)` : ''}
                            </p>
                            {generatorError && <p className="text-xs text-red-300 mt-1">{generatorError}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void handleStartGenerator()}
                                disabled={isGeneratorBusy || generatorStatus.running}
                                className="px-3 py-1.5 rounded-md border border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10 disabled:opacity-60"
                            >
                                Start Faker Loop
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleStopGenerator()}
                                disabled={isGeneratorBusy || !generatorStatus.running}
                                className="px-3 py-1.5 rounded-md border border-[#B9A5D2] text-[#B9A5D2] hover:bg-[#B9A5D2]/10 disabled:opacity-60"
                            >
                                Stop Faker Loop
                            </button>
                        </div>
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
                            {movieLogs.length === 0 && (
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

                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-10 h-10 rounded-md transition-colors btn-press ${currentPage === i + 1 ? 'bg-[#E0BAAA] text-[#261834]' : 'bg-[#223662] text-[#B9A5D2]'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}