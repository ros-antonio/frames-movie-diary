import { ArrowLeft, Film, Calendar, Star, MessageSquare } from 'lucide-react';
import type { MovieLog } from '../types';
import { useMovieForm } from '../hooks/useMovieForm';

interface LogNewMovieProps {
    onSave: (movie: { movieName: string; watchDate: string; rating?: number; review?: string }) => void;
    onCancel: () => void;
    initialData?: MovieLog;
}

export function LogNewMovie({ onSave, onCancel, initialData }: LogNewMovieProps) {
    const { formData, setFormData, handleSubmit } = useMovieForm(onSave, initialData);

    return (
        <div className="min-h-screen p-8 bg-[#261834]">
            <div className="max-w-3xl mx-auto">
                <button onClick={onCancel} className="flex items-center mb-6 text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>

                <div className="flex items-center gap-3 mb-2">
                    <Film className="w-8 h-8 text-[#E0BAAA]" />
                    <h1 className="text-4xl font-bold text-[#B9A5D2]">
                        {initialData ? 'Edit Movie' : 'Log New Movie'}
                    </h1>
                </div>
                <p className="opacity-70 text-[#B9A5D2] mb-8">
                    {initialData ? 'Update your diary entry' : 'Add a new entry to your cinema diary'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="rounded-lg p-8 space-y-6 bg-[#223662]">
                        <div className="space-y-2">
                            <label className="block text-sm text-[#E0BAAA]">Movie Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-[#1a1f3a] text-[#B9A5D2] border-2 border-[#B9A5D2]/20 outline-none focus:border-[#E0BAAA]/50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm flex items-center gap-2 text-[#E0BAAA]">
                                    <Calendar className="w-4 h-4" /> Watch Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.watchDate}
                                    onChange={(e) => setFormData({ ...formData, watchDate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-[#1a1f3a] text-[#B9A5D2] border-2 border-[#B9A5D2]/20 outline-none [scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm flex items-center gap-2 text-[#E0BAAA]">
                                    <Star className="w-4 h-4" /> Rating (0-5)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={formData.rating}
                                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-lg bg-[#1a1f3a] text-[#B9A5D2] border-2 border-[#B9A5D2]/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm flex items-center gap-2 text-[#E0BAAA]">
                                <MessageSquare className="w-4 h-4" /> Review
                            </label>
                            <textarea
                                rows={4}
                                value={formData.review}
                                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-[#1a1f3a] text-[#B9A5D2] border-2 border-[#B9A5D2]/20 outline-none focus:border-[#E0BAAA]/50 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 justify-end">
                        <button type="button" onClick={onCancel} className="px-8 py-3 rounded-md border border-[#B9A5D2]/40 text-[#B9A5D2]">
                            Cancel
                        </button>
                        <button type="submit" className="px-8 py-3 rounded-md bg-[#E0BAAA] text-[#261834] font-bold flex items-center">
                            <Film className="w-4 h-4 mr-2" /> {initialData ? 'Update Movie' : 'Save Movie'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}