import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Edit, Trash2, Star, Film, Link as LinkIcon, ListPlus, Search, Upload } from 'lucide-react';
import type { CustomList, MovieLog, SavedFrame } from '../types';
import { useMovieDetail } from '../hooks/useMovieDetail';

interface MovieDetailProps {
    movie: MovieLog;
    onBack: () => void;
    onDelete: (id: string) => void;
    onEdit: () => void;
    onAddFrame?: (movieId: string, frameData: Omit<SavedFrame, 'id'>) => Promise<boolean> | boolean | void;
    onDeleteFrame?: (movieId: string, frameId: string) => Promise<boolean> | boolean | void;
    customLists?: CustomList[];
    onAddMovieToList?: (listId: string, movieId: string) => Promise<boolean> | boolean | void;
    accountMenu?: ReactNode;
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

interface CaptureErrors {
    videoUrl?: string;
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

function validateCaptureWorkspace(input: { videoUrl: string; caption: string }): CaptureErrors {
    const errors: CaptureErrors = {};

    const trimmedVideoUrl = input.videoUrl.trim();
    if (!trimmedVideoUrl) {
        errors.videoUrl = 'Direct video URL is required';
    } else if (!/^https?:\/\//.test(trimmedVideoUrl)) {
        errors.videoUrl = 'Video URL must start with https:// or http://';
    }

    const trimmedCaption = input.caption.trim();
    if (!trimmedCaption) {
        errors.caption = 'Caption is required';
    } else if (trimmedCaption.length > 140) {
        errors.caption = 'Caption must be 140 characters or fewer';
    }

    return errors;
}

function formatVideoTimestamp(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

export function MovieDetail({
    movie,
    onBack,
    onDelete,
    onEdit,
    onAddFrame,
    onDeleteFrame,
    customLists = [],
    onAddMovieToList,
    accountMenu,
}: MovieDetailProps) {
    const { handleDelete } = useMovieDetail(movie, onDelete);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [isSavingUpload, setIsSavingUpload] = useState(false);
    const [isSavingCapture, setIsSavingCapture] = useState(false);
    const [uploadForm, setUploadForm] = useState<UploadFormData>({
        imageFile: null,
        timestamp: '',
        caption: '',
    });
    const [uploadErrors, setUploadErrors] = useState<UploadErrors>({});
    const [captureVideoUrl, setCaptureVideoUrl] = useState(movie.movieLink ?? '');
    const [captureLoadedUrl, setCaptureLoadedUrl] = useState(movie.movieLink ?? '');
    const [captureCaption, setCaptureCaption] = useState('');
    const [captureErrors, setCaptureErrors] = useState<CaptureErrors>({});
    const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<SavedFrame | null>(null);
    const normalizedListSearchQuery = listSearchQuery.trim().toLowerCase();
    const currentLists = customLists.filter((list) => list.movieIds.includes(movie.id));
    const availableLists = customLists.filter((list) => !list.movieIds.includes(movie.id));
    const filteredAvailableLists = availableLists.filter((list) => (
        list.name.toLowerCase().includes(normalizedListSearchQuery)
        || list.description.toLowerCase().includes(normalizedListSearchQuery)
    ));

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadForm({ imageFile: null, timestamp: '', caption: '' });
        setUploadErrors({});
    };

    const closeCaptureModal = () => {
        setIsCaptureModalOpen(false);
        setCaptureVideoUrl(movie.movieLink ?? '');
        setCaptureLoadedUrl(movie.movieLink ?? '');
        setCaptureCaption('');
        setCaptureErrors({});
        setCaptureFeedback(null);
    };

    const closeAddToListModal = () => {
        setIsAddToListModalOpen(false);
        setListSearchQuery('');
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

    const openCaptureModal = () => {
        setCaptureVideoUrl(movie.movieLink ?? '');
        setCaptureLoadedUrl(movie.movieLink ?? '');
        setCaptureCaption('');
        setCaptureErrors({});
        setCaptureFeedback(null);
        setIsCaptureModalOpen(true);
    };

    const handleLoadCaptureVideo = () => {
        const trimmedVideoUrl = captureVideoUrl.trim();
        if (!trimmedVideoUrl) {
            setCaptureErrors({ videoUrl: 'Direct video URL is required', caption: captureErrors.caption });
            return;
        }

        if (!/^https?:\/\//.test(trimmedVideoUrl)) {
            setCaptureErrors({ videoUrl: 'Video URL must start with https:// or http://', caption: captureErrors.caption });
            return;
        }

        setCaptureErrors((current) => ({ ...current, videoUrl: undefined }));
        setCaptureFeedback(null);
        setCaptureLoadedUrl(trimmedVideoUrl);
    };

    const handleCaptureFrame = async () => {
        if (!onAddFrame) {
            return;
        }

        const video = videoRef.current;
        const validationErrors = validateCaptureWorkspace({
            videoUrl: captureVideoUrl,
            caption: captureCaption,
        });
        setCaptureErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        if (!video || !captureLoadedUrl) {
            setCaptureFeedback('Load a direct video URL before saving a frame.');
            return;
        }

        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            setCaptureFeedback('Wait for the video to load before capturing a frame.');
            return;
        }

        setIsSavingCapture(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');

            if (!context) {
                setCaptureFeedback('Your browser could not prepare a frame capture canvas.');
                return;
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageUrl = canvas.toDataURL('image/png');
            const saved = await onAddFrame(movie.id, {
                imageUrl,
                timestamp: formatVideoTimestamp(video.currentTime),
                caption: captureCaption.trim(),
            });
            if (saved !== false) {
                closeCaptureModal();
            }
        } catch {
            setCaptureFeedback('This video source does not allow in-browser frame capture. Use a direct video URL with browser playback access.');
        } finally {
            setIsSavingCapture(false);
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

    const handleAddMovieToList = async (listId: string) => {
        if (!onAddMovieToList) {
            return;
        }

        const saved = await onAddMovieToList(listId, movie.id);
        if (saved !== false) {
            closeAddToListModal();
        }
    };

    return (
        <div className="min-h-screen p-8 bg-[#261834]">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center text-[#B9A5D2] transition-colors hover:text-[#E0BAAA]"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Diary
                    </button>
                    {accountMenu}
                </div>

                <div className="rounded-lg bg-[#223662] p-8 space-y-6">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="space-y-4 flex-1">
                            <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>
                                {movie.movieName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <p className="mb-1 text-sm font-medium" style={{ color: '#D7C6E7' }}>
                                        Watch Date
                                    </p>
                                    <p style={{ color: '#F0E8FA' }}>
                                        {new Date(movie.watchDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="mb-1 text-sm font-medium" style={{ color: '#D7C6E7' }}>
                                        Rating
                                    </p>
                                    <StarRating rating={movie.rating} />
                                    {(movie.rating === undefined || movie.rating < 0.5) && (
                                        <p className="mt-1 text-xs" style={{ color: '#D7C6E7' }}>
                                            Not rated
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-sm font-medium" style={{ color: '#D7C6E7' }}>
                                    In Custom Lists
                                </p>
                                {currentLists.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {currentLists.map((list) => (
                                            <span
                                                key={list.id}
                                                className="rounded-full border border-[#DDB4C8]/45 bg-[#3A3561] px-3 py-1 text-sm font-medium shadow-[0_4px_10px_rgba(12,16,34,0.16)]"
                                                style={{ color: '#FBE7EF' }}
                                            >
                                                {list.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm" style={{ color: '#E2D4EF' }}>
                                        Not added to any custom list yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {onAddMovieToList && (
                                <button
                                    onClick={() => setIsAddToListModalOpen(true)}
                                    className="p-2 rounded-md hover:bg-[#E0BAAA]/10 transition-colors"
                                    style={{ color: '#E0BAAA' }}
                                    title="Add to Custom List"
                                >
                                    <ListPlus className="w-5 h-5" />
                                </button>
                            )}
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
                            <p className="leading-relaxed text-lg opacity-95" style={{ color: '#E7D9F1' }}>
                                {movie.review}
                            </p>
                        </div>
                    )}

                    {movie.movieLink && (
                        <div className="space-y-4 pt-4 border-t border-[#B9A5D2]/20">
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
                                    type="button"
                                    onClick={openCaptureModal}
                                    disabled={!onAddFrame}
                                    className="flex items-center px-3 py-1.5 rounded-md border text-sm transition-colors border-[#E0BAAA] text-[#E0BAAA] hover:bg-[#E0BAAA]/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Film className="w-4 h-4 mr-2" />
                                    Capture New Frame
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="flex items-center px-3 py-1.5 rounded-md border text-sm transition-colors border-[#B9A5D2] text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload PNG Frame
                                </button>
                            </div>
                        </div>

                        {captureFeedback && (
                            <div role="alert" className="rounded-md border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                                {captureFeedback}
                            </div>
                        )}

                        {movie.frames.length === 0 ? (
                            <div className="relative rounded-lg border border-[#B9A5D2]/12 bg-[#1a1f3a] p-6 py-12 text-center italic text-[#E2D4EF]">
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

            {isCaptureModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#B9A5D2]/20 bg-[#314577] shadow-[0_24px_70px_rgba(8,12,30,0.45)]">
                        <div className="flex items-center justify-between gap-4 border-b border-[#B9A5D2]/18 px-5 py-5">
                            <h2 className="flex items-center gap-3 text-2xl font-semibold" style={{ color: '#D8C5E5' }}>
                                <Film className="h-6 w-6 text-[#E0BAAA]" />
                                Capture Frames
                            </h2>
                            <button
                                type="button"
                                onClick={closeCaptureModal}
                                className="text-3xl leading-none text-[#D8C5E5]/85 transition-colors hover:text-[#FBE7EF]"
                                aria-label="Close capture modal"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-4">
                            <div className="flex flex-col gap-3 md:flex-row">
                                <input
                                    type="text"
                                    value={captureVideoUrl}
                                    onChange={(event) => setCaptureVideoUrl(event.target.value)}
                                    placeholder="Paste direct video URL here..."
                                    className="w-full rounded-2xl border border-[#B9A5D2]/10 bg-[#1f2547] px-4 py-3 text-[#D8C5E5] outline-none placeholder:text-[#B9A5D2]/45"
                                />
                                <button
                                    type="button"
                                    onClick={handleLoadCaptureVideo}
                                    className="rounded-2xl bg-[#596A97] px-6 py-3 font-medium text-[#D8C5E5] transition-opacity hover:opacity-90"
                                >
                                    Load
                                </button>
                            </div>
                            {captureErrors.videoUrl && <p className="text-xs text-red-300">{captureErrors.videoUrl}</p>}
                            <p className="text-sm text-[#D8C5E5]/65">Use a direct browser-playable video URL to capture frames.</p>

                            <div className="overflow-hidden rounded-2xl bg-[#14182F]">
                                {captureLoadedUrl ? (
                                    <video
                                        ref={videoRef}
                                        key={captureLoadedUrl}
                                        controls
                                        crossOrigin="anonymous"
                                        preload="metadata"
                                        className="aspect-video w-full bg-black"
                                        src={captureLoadedUrl}
                                    >
                                        Your browser does not support HTML5 video playback.
                                    </video>
                                ) : (
                                    <div className="flex aspect-video flex-col items-center justify-center gap-5 px-6 text-center text-[#D8C5E5]/55">
                                        <Film className="h-12 w-12" />
                                        <div className="space-y-2">
                                            <p className="text-2xl font-medium">Load a video to begin capturing</p>
                                            <p className="text-sm">Paste a direct link, then load it in the player above.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-4 border-t border-[#B9A5D2]/16 pt-4 md:flex-row md:items-end md:justify-between">
                                <div className="flex-1">
                                    <label htmlFor="capture-caption" className="mb-2 block text-sm font-semibold tracking-[0.08em] text-[#D8C5E5]/85">
                                        FRAME CAPTION
                                    </label>
                                    <input
                                        id="capture-caption"
                                        type="text"
                                        value={captureCaption}
                                        onChange={(event) => setCaptureCaption(event.target.value)}
                                        placeholder="Why are you saving this frame?"
                                        className="w-full rounded-2xl border border-[#B9A5D2]/10 bg-[#1f2547] px-4 py-3 text-[#D8C5E5] outline-none placeholder:text-[#B9A5D2]/45"
                                    />
                                    {captureErrors.caption && <p className="mt-1 text-xs text-red-300">{captureErrors.caption}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCaptureFrame()}
                                    disabled={isSavingCapture}
                                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#E7C6AB] px-6 py-3 font-semibold text-[#2B2445] transition-opacity hover:opacity-92 disabled:opacity-60"
                                >
                                    <Film className="h-5 w-5" />
                                    {isSavingCapture ? 'Saving...' : 'Save Frame'}
                                </button>
                            </div>

                            {captureFeedback && (
                                <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                                    {captureFeedback}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAddToListModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-lg rounded-lg border border-[#B9A5D2]/20 bg-[#223662] p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl" style={{ color: '#E0BAAA' }}>
                                    Add to Custom List
                                </h2>
                                <p className="text-sm text-[#B9A5D2]">
                                    Choose one of your lists for {movie.movieName}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAddToListModal}
                                className="rounded-md border border-[#B9A5D2]/30 px-3 py-1.5 text-sm text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                            >
                                Close
                            </button>
                        </div>

                        <label className="mb-4 flex items-center gap-3 rounded-md border border-[#B9A5D2]/20 bg-[#1a1f3a] px-3 py-2">
                            <Search className="h-4 w-4 text-[#E0BAAA]" />
                            <input
                                type="search"
                                value={listSearchQuery}
                                onChange={(event) => setListSearchQuery(event.target.value)}
                                placeholder="Search lists"
                                className="w-full bg-transparent text-[#F0E8FA] outline-none placeholder:text-[#B9A5D2]/55"
                                aria-label="Search custom lists"
                            />
                        </label>

                        {filteredAvailableLists.length > 0 ? (
                            <div className="max-h-80 space-y-3 overflow-auto pr-1">
                                {filteredAvailableLists.map((list) => (
                                    <div
                                        key={list.id}
                                        className="flex items-center justify-between gap-4 rounded-md bg-[#1a1f3a] p-4"
                                    >
                                        <div>
                                            <p className="font-medium text-[#F0E8FA]">{list.name}</p>
                                            <p className="mt-1 text-sm text-[#B9A5D2]/75">
                                                {list.description || 'No description yet.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleAddMovieToList(list.id)}
                                            className="rounded-md bg-[#E0BAAA] px-3 py-2 text-sm font-semibold text-[#261834] hover:opacity-90"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-[#B9A5D2]/20 bg-[#1a1f3a] p-6 text-sm text-[#B9A5D2]/75">
                                {availableLists.length === 0
                                    ? 'This movie is already in all of your custom lists.'
                                    : 'No custom lists match that search.'}
                            </div>
                        )}
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
