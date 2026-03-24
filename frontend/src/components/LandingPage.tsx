import { Film } from 'lucide-react';

interface LandingPageProps {
    onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-[#261834]">
            <div className="max-w-2xl w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-[#223662] flex items-center justify-center">
                        <Film className="w-12 h-12" style={{ color: '#E0BAAA' }} />
                    </div>
                </div>

                <h1 className="text-6xl tracking-tight font-bold" style={{ color: '#B9A5D2' }}>
                    Frames
                </h1>

                <p className="text-2xl font-medium" style={{ color: '#E0BAAA' }}>
                    Collect the moments that move you
                </p>

                <p className="text-lg leading-relaxed max-w-xl mx-auto opacity-90" style={{ color: '#B9A5D2' }}>
                    A private gallery to log your watches, rate your favorites, and preserve your cinematic souvenirs long after the credits roll.
                </p>

                <div className="flex gap-4 justify-center pt-4">
                    <button
                        onClick={onEnter}
                        className="px-8 py-4 text-lg font-semibold hover:opacity-90 transition-opacity rounded-md"
                        style={{
                            backgroundColor: '#E0BAAA',
                            color: '#261834',
                        }}
                    >
                        Enter Diary
                    </button>
                </div>
            </div>
        </div>
    );
}