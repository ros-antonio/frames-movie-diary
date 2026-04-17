import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Edit, Trash2, Star, Film, Link as LinkIcon, Upload } from 'lucide-react';
import type { MovieLog, SavedFrame } from '../types';
import { useMovieDetail } from '../hooks/useMovieDetail';

interface MovieDetailProps {
    movie: MovieLog;
    onBack: () => void;
    onDelete: (id: string) => void;
    onEdit: () => void;
    onAddFrame?: (movieId: string, frameData: Omit<SavedFrame, 'id'>) => Promise<boolean> | boolean | void;
    onDeleteFrame?: (movieId: string, frameId: string) => Promise<boolean> | boolean | void;
}

interface UploadFormData {
    imageFile: File | null;
    timestamp: string;
    caption: string;
}

interface UploadErrors {
    imageFile?: string;
    timestamp?: string;
    caption?: string;
}

const maxUploadPngBytes = 6 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

function validateUploadForm(formData: UploadFormData): UploadErrors {
    const errors: UploadErrors = {};
    const timestampPattern = /^(?:[0-1]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

    if (!formData.imageFile) {
        errors.imageFile = 'PNG image is required';
    } else if (formData.imageFile.type !== 'image/png') {
        errors.imageFile = 'Only .png files are allowed';
    } else if (formData.imageFile.size > maxUploadPngBytes) {
        errors.imageFile = 'PNG image must be 6 MB or smaller';
    }

    const trimmedTimestamp = formData.timestamp.trim();
    if (!trimmedTimestamp) {
        errors.timestamp = 'Timestamp is required';
    } else if (!timestampPattern.test(trimmedTimestamp)) {
        errors.timestamp = 'Use HH:MM or HH:MM:SS format';
    }

    const trimmedCaption = formData.caption.trim();
    if (!trimmedCaption) {
        errors.caption = 'Caption is required';
    } else if (trimmedCaption.length > 140) {
        errors.caption = 'Caption must be 140 characters or fewer';
    }

    return errors;
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

export function MovieDetail({ movie, onBack, onDelete, onEdit, onAddFrame, onDeleteFrame }: MovieDetailProps) {
    const { handleDelete } = useMovieDetail(movie, onDelete);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSavingUpload, setIsSavingUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState<UploadFormData>({
        imageFile: null,
        timestamp: '',
        caption: '',
    });
    const [uploadErrors, setUploadErrors] = useState<UploadErrors>({});
    const [selectedFrame, setSelectedFrame] = useState<SavedFrame | null>(null);

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadForm({ imageFile: null, timestamp: '', caption: '' });
        setUploadErrors({});
    };

    const handleUploadSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const errors = validateUploadForm(uploadForm);
        setUploadErrors(errors);
        if (Object.keys(errors).length > 0 || !uploadForm.imageFile || !onAddFrame) {
            return;
        }

        setIsSavingUpload(true);
        try {
            const imageUrl = await readFileAsDataUrl(uploadForm.imageFile);
            const saved = await onAddFrame(movie.id, {
                imageUrl,
                timestamp: uploadForm.timestamp.trim(),
                caption: uploadForm.caption.trim(),
            });
            if (saved !== false) {
                closeUploadModal();
            }
        } finally {
            setIsSavingUpload(false);
        }
    };

    const handleDeleteFrame = (frameId: string) => {
        if (!onDeleteFrame) {
            return;
        }

        const shouldDelete = window.confirm('Delete this frame?');
        if (!shouldDelete) {
            return;
        }

        onDeleteFrame(movie.id, frameId);
        setSelectedFrame((current) => (current?.id === frameId ? null : current));
    };

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

                    {movie.movieLink && (
                        <div className="space-y-2 pt-4 border-t border-[#B9A5D2]/20">
                            <h3 className="text-xl flex items-center gap-2" style={{ color: '#E0BAAA' }}>
                                <LinkIcon className="w-5 h-5" /> Movie Link
                            </h3>
                            <a
                                href={movie.movieLink}
                                target="_blank"
                                rel="noreferrer"
                                className="underline break-all opacity-90 hover:opacity-100"
                                style={{ color: '#B9A5D2' }}
                            >
                                {movie.movieLink}
                            </a>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-[#B9A5D2]/20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl" style={{ color: '#E0BAAA' }}>
                                Saved Frames
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => alert("Video Capture Mode is a Silver/Gold feature coming next week!")}
                                    className="flex items-center px-3 py-1.5 rounded-md border text-sm transition-colors border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10"
                                >
                                    <Film className="w-4 h-4 mr-2" />
                                    Capture New Frame
                                </button>
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="flex items-center px-3 py-1.5 rounded-md border text-sm transition-colors border-[#B9A5D2] text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload PNG Frame
                                </button>
                            </div>
                        </div>

                        {movie.frames.length === 0 ? (
                            <div className="relative rounded-lg p-6 bg-[#1a1f3a] border border-[#B9A5D2]/10 text-center text-[#B9A5D2] italic py-12">
                                No frames captured yet. Click "Capture New Frame" or "Upload PNG Frame" to add screenshots.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {movie.frames.map((frame) => (
                                    <article key={frame.id} className="rounded-lg p-3 bg-[#1a1f3a] border border-[#B9A5D2]/10 space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFrame(frame)}
                                            className="block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-[#E0BAAA]/70"
                                            aria-label={`Open frame preview: ${frame.caption || frame.timestamp}`}
                                        >
                                            <img
                                                src={frame.imageUrl}
                                                alt={frame.caption || 'Saved frame'}
                                                className="w-full h-48 object-cover rounded-md"
                                            />
                                        </button>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteFrame(frame.id)}
                                                className="px-2 py-1 rounded-md border border-red-300/40 text-red-300 hover:bg-red-500/15 text-xs"
                                            >
                                                Delete Frame
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-xs opacity-70" style={{ color: '#B9A5D2' }}>Timestamp</p>
                                            <p style={{ color: '#E0BAAA' }}>{frame.timestamp}</p>
                                        </div>
                                        <p className="text-sm" style={{ color: '#B9A5D2' }}>{frame.caption}</p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-lg p-5 bg-[#223662] border border-[#B9A5D2]/20">
                        <h2 className="text-xl mb-4" style={{ color: '#E0BAAA' }}>
                            Upload PNG Frame
                        </h2>
                        <form className="space-y-4" onSubmit={handleUploadSubmit}>
                            <div>
                                <label htmlFor="frame-upload" className="block text-sm mb-1" style={{ color: '#B9A5D2' }}>
                                    PNG Screenshot
                                </label>
                                <input
                                    id="frame-upload"
                                    type="file"
                                    accept=".png,image/png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setUploadForm((current) => ({ ...current, imageFile: file }));
                                    }}
                                    className="block w-full text-sm text-[#B9A5D2] file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#E0BAAA]/20 file:text-[#E0BAAA]"
                                />
                                {uploadErrors.imageFile && <p className="text-red-300 text-xs mt-1">{uploadErrors.imageFile}</p>}
                            </div>

                            <div>
                                <label htmlFor="frame-timestamp" className="block text-sm mb-1" style={{ color: '#B9A5D2' }}>
                                    Timestamp (HH:MM or HH:MM:SS)
                                </label>
                                <input
                                    id="frame-timestamp"
                                    type="text"
                                    value={uploadForm.timestamp}
                                    onChange={(e) => setUploadForm((current) => ({ ...current, timestamp: e.target.value }))}
                                    className="w-full rounded-md px-3 py-2 bg-[#1a1f3a] border border-[#B9A5D2]/20 text-[#B9A5D2]"
                                    placeholder="00:12:34"
                                />
                                {uploadErrors.timestamp && <p className="text-red-300 text-xs mt-1">{uploadErrors.timestamp}</p>}
                            </div>

                            <div>
                                <label htmlFor="frame-caption" className="block text-sm mb-1" style={{ color: '#B9A5D2' }}>
                                    Caption
                                </label>
                                <input
                                    id="frame-caption"
                                    type="text"
                                    value={uploadForm.caption}
                                    onChange={(e) => setUploadForm((current) => ({ ...current, caption: e.target.value }))}
                                    className="w-full rounded-md px-3 py-2 bg-[#1a1f3a] border border-[#B9A5D2]/20 text-[#B9A5D2]"
                                    placeholder="What makes this frame memorable?"
                                />
                                {uploadErrors.caption && <p className="text-red-300 text-xs mt-1">{uploadErrors.caption}</p>}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    className="px-3 py-1.5 rounded-md border border-[#B9A5D2]/40 text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingUpload}
                                    className="px-3 py-1.5 rounded-md border border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10 disabled:opacity-60"
                                >
                                    {isSavingUpload ? 'Saving...' : 'Save Frame'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedFrame && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setSelectedFrame(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Frame preview"
                >
                    <div
                        className="w-full max-w-6xl max-h-[92vh] rounded-lg bg-[#111827] border border-[#B9A5D2]/20 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#B9A5D2]/20 bg-[#111827]/95 backdrop-blur-sm">
                            <p className="text-sm font-medium" style={{ color: '#B9A5D2' }}>Frame Preview</p>
                            <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleDeleteFrame(selectedFrame.id)}
                                className="px-3 py-1.5 rounded-md border border-red-300/40 text-red-300 hover:bg-red-500/15"
                            >
                                Delete Frame
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedFrame(null)}
                                className="px-3 py-1.5 rounded-md border border-[#B9A5D2]/40 text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                            >
                                Close
                            </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[calc(92vh-58px)]">
                            <img
                                src={selectedFrame.imageUrl}
                                alt={selectedFrame.caption || 'Saved frame preview'}
                                className="w-full max-h-[70vh] object-contain rounded-md"
                            />
                            <div className="mt-3 space-y-1">
                                <p className="text-sm" style={{ color: '#E0BAAA' }}>Timestamp: {selectedFrame.timestamp}</p>
                                <p className="text-sm" style={{ color: '#B9A5D2' }}>{selectedFrame.caption}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}