import { useCallback, useEffect, useRef, useState } from 'react';
import { playNote, stopNote } from './utils/audioUtils';

interface GuitarString {
    name: string;
    frequency: number;
    // Standard string numbering: 6th (low E) through 1st (high e).
    number: number;
}

const STRINGS: GuitarString[] = [
    { name: 'E', frequency: 82.41, number: 6 },
    { name: 'A', frequency: 110.0, number: 5 },
    { name: 'D', frequency: 146.83, number: 4 },
    { name: 'G', frequency: 196.0, number: 3 },
    { name: 'B', frequency: 246.94, number: 2 },
    { name: 'e', frequency: 329.63, number: 1 },
];

const NOTE_INTERVAL_MS = 3000;

function App() {
    const [activeString, setActiveString] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        stopNote();
        setActiveString(null);
    }, []);

    const start = useCallback((index: number) => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
        }

        const { frequency } = STRINGS[index];
        setActiveString(index);
        playNote(frequency);
        intervalRef.current = window.setInterval(() => {
            playNote(frequency);
        }, NOTE_INTERVAL_MS);
    }, []);

    const handleStringClick = (index: number) => {
        start(index);
    };

    useEffect(() => stop, [stop]);

    return (
        <div className="min-h-screen w-full flex flex-col bg-neutral-900 text-white px-4">
            <h1 className="pt-16 text-center text-4xl font-semibold tracking-wide">Guitar Tuner</h1>

            <div className="flex flex-1 flex-col items-center justify-center gap-8">
                <div className="flex flex-row gap-4">
                    {STRINGS.map((string, index) => (
                        <button
                            key={string.name}
                            onClick={() => handleStringClick(index)}
                            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg text-2xl font-bold border-2 transition-colors ${
                                activeString === index
                                    ? 'bg-emerald-500 border-emerald-400'
                                    : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'
                            }`}
                        >
                            <span
                                className={`absolute top-1 right-1.5 text-[10px] font-normal ${
                                    activeString === index ? 'text-emerald-100/80' : 'text-neutral-500'
                                }`}
                            >
                                {string.number}
                            </span>
                            {string.name}
                        </button>
                    ))}
                </div>

                <button
                    onClick={stop}
                    disabled={activeString === null}
                    className={`px-6 py-2 rounded-lg text-lg font-medium transition-colors ${
                        activeString === null
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                >
                    Stop
                </button>
            </div>
        </div>
    );
}

export default App;
