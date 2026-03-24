import { ArrowLeft, Edit, Trash2, Star, Film } from 'lucide-react';
import type { MovieLog } from '../types';
import { useMovieDetail } from '../hooks/useMovieDetail';

interface MovieDetailProps {
    movie: MovieLog;
    onBack: () => void;
    onDelete: (id: string) => void;
    onEdit: () => void;
}

function StarRating({ rating = 0 }: { rating?: number }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((starPosition) => {
                const fillPercentage = Math.max(0, Math.min(1, rating - (starPosition - 1))) * 100;

                return (
                    <div key={starPosition} className="relative inline-block">
                        <Star className="w-6 h-6" style={{ color: '#E0BAAA' }} />
                        <div
                            className="absolute top-0 left-0 overflow-hidden"
                            style={{ width: `${fillPercentage}%` }}
                        >
                            <Star className="w-6 h-6" fill="#E0BAAA" style={{ color: '#E0BAAA' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function MovieDetail({ movie, onBack, onDelete, onEdit }: MovieDetailProps) {
    const { handleDelete } = useMovieDetail(movie, onDelete);

    return (
        <div className="min-h-screen p-8 bg-[#261834]">
            <div className="max-w-4xl mx-auto space-y-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Diary
                </button>

                <div className="rounded-lg p-8 space-y-6 bg-[#223662]">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="space-y-4 flex-1">
                            <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>
                                {movie.movieName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <p className="text-sm opacity-70 mb-1" style={{ color: '#B9A5D2' }}>
                                        Watch Date
                                    </p>
                                    <p style={{ color: '#B9A5D2' }}>
                                        {new Date(movie.watchDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm opacity-70 mb-1" style={{ color: '#B9A5D2' }}>
                                        Rating
                                    </p>
                                    <StarRating rating={movie.rating} />
                                    {(movie.rating === undefined || movie.rating < 0.5) && (
                                        <p className="text-xs mt-1 opacity-70" style={{ color: '#B9A5D2' }}>
                                            Not rated
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onEdit}
                                className="p-2 rounded-md hover:bg-[#E0BAAA]/10 transition-colors"
                                style={{ color: '#E0BAAA' }}
                                title="Edit Movie"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-2 rounded-md hover:bg-red-500/20 transition-colors text-red-400"
                                title="Delete Movie"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {movie.review && (
                        <div className="space-y-3 pt-4 border-t border-[#B9A5D2]/20">
                            <h3 className="text-xl" style={{ color: '#E0BAAA' }}>
                                Review
                            </h3>
                            <p className="leading-relaxed text-lg opacity-90" style={{ color: '#B9A5D2' }}>
                                {movie.review}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-[#B9A5D2]/20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl" style={{ color: '#E0BAAA' }}>
                                Saved Frames
                            </h3>
                            <button
                                onClick={() => alert("Video Capture Mode is a Silver/Gold feature coming next week!")}
                                className="flex items-center px-3 py-1.5 rounded-md border text-sm transition-colors border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10"
                            >
                                <Film className="w-4 h-4 mr-2" />
                                Capture New Frame
                            </button>
                        </div>

                        <div className="relative rounded-lg p-6 bg-[#1a1f3a] border border-[#B9A5D2]/10 text-center text-[#B9A5D2] italic py-12">
                            No frames captured yet. Click "Capture New Frame" to start taking screenshots from your video!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}