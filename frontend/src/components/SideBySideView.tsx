import { Film } from 'lucide-react';
import type { MovieLog } from '../types';

interface SideBySideViewProps {
    currentMovies: MovieLog[];
    allMoviesCount: number;
    onSelectMovie: (id: string) => void;
    requestSort: (field: 'movieName' | 'watchDate') => void;
    renderSortIcon: (field: 'movieName' | 'watchDate') => React.ReactNode;
}

export function SideBySideView({
    currentMovies,
    allMoviesCount,
    onSelectMovie,
    requestSort,
    renderSortIcon,
}: SideBySideViewProps) {
    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Table view on the left */}
            <div className="rounded-lg overflow-auto bg-[#223662]" style={{ maxHeight: '600px' }}>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#B9A5D2]/20">
                            <th className="p-4 font-semibold text-[#E0BAAA]">
                                <button
                                    onClick={() => requestSort('movieName')}
                                    className="flex items-center gap-2 hover:text-white transition-colors text-sm"
                                >
                                    Movie Name {renderSortIcon('movieName')}
                                </button>
                            </th>
                            <th className="p-4 font-semibold text-[#E0BAAA]">
                                <button
                                    onClick={() => requestSort('watchDate')}
                                    className="flex items-center gap-2 hover:text-white transition-colors text-sm"
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
                                className="border-b border-[#B9A5D2]/10 hover:bg-[#B9A5D2]/5 cursor-pointer transition-colors"
                            >
                                <td className="p-4 text-sm">{movie.movieName}</td>
                                <td className="p-4 text-sm">{new Date(movie.watchDate).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {allMoviesCount === 0 && (
                            <tr>
                                <td colSpan={2} className="p-8 text-center opacity-50 italic">
                                    No movies logged yet. Click "Log New Movie" to start!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Card view on the right */}
            <div className="space-y-3 overflow-y-auto rounded-lg" style={{ maxHeight: '600px' }}>
                {currentMovies.map((movie) => (
                    <div
                        key={movie.id}
                        onClick={() => onSelectMovie(movie.id)}
                        className="rounded-lg p-4 space-y-2 cursor-pointer bg-[#223662] hover:ring-2 hover:ring-[#E0BAAA] transition-all"
                    >
                        <div className="flex items-start justify-between">
                            <Film className="w-5 h-5 text-[#E0BAAA]" />
                            <span className="text-xs opacity-70">{new Date(movie.watchDate).getFullYear()}</span>
                        </div>
                        <h3 className="text-lg font-bold">{movie.movieName}</h3>
                        <div className="pt-2 border-t border-[#B9A5D2]/20">
                            <p style={{ color: '#E0BAAA' }} className="text-sm">
                                {new Date(movie.watchDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
                {allMoviesCount === 0 && (
                    <div className="text-center opacity-50 italic p-8">
                        No movies logged yet. Click "Log New Movie" to start!
                    </div>
                )}
            </div>
        </div>
    );
}

