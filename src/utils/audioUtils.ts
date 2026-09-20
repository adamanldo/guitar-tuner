// Synthesizes a plucked guitar string using the Karplus-Strong algorithm:
// a noise burst is repeatedly averaged and fed back through a short delay
// line, which is what gives it a decaying, string-like timbre instead of a
// flat tone.
const PLUCK_DURATION_SECONDS = 2.5;
const STRING_DECAY = 0.996;
const DEFAULT_VOLUME = 0.8;
const RELEASE_SECONDS = 0.05;
// A hard, instant onset reads as a harsh click; ramping the gain up over a
// few milliseconds softens the attack without making the pluck feel slow.
const ATTACK_SECONDS = 0.004;

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;

// Raw Karplus-Strong output is broadband and reads as shrill/trebly on its
// own; a lowpass tamps down the harsh upper harmonics to sound more like a
// mellow acoustic pluck. Brightness doesn't scale linearly with pitch by
// ear, so these are hand-tuned per string rather than derived from a
// formula (keyed on the exact STRINGS frequencies in App.tsx).
const LOWPASS_CUTOFFS_HZ: Record<number, number> = {
    82.41: 1450, // E (6th)
    110.0: 1600, // A (5th)
    146.83: 1750, // D (4th)
    196.0: 2780, // G (3rd)
    246.94: 3430, // B (2nd)
    329.63: 4580, // e (1st)
};

function toneLowpassFrequency(frequency: number): number {
    return LOWPASS_CUTOFFS_HZ[frequency];
}

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
        void audioContext.resume();
    }
    return audioContext;
}

function createPluckBuffer(context: AudioContext, frequency: number): AudioBuffer {
    const sampleRate = context.sampleRate;
    const totalSamples = Math.floor(sampleRate * PLUCK_DURATION_SECONDS);
    const ringSize = Math.round(sampleRate / frequency);
    const ring = new Float32Array(ringSize);

    for (let i = 0; i < ringSize; i++) {
        ring[i] = Math.random() * 2 - 1;
    }

    const buffer = context.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
        const j = i % ringSize;
        const next = (j + 1) % ringSize;
        output[i] = ring[j];
        ring[j] = STRING_DECAY * 0.5 * (ring[j] + ring[next]);
    }

    return buffer;
}

// Stops whatever note is currently sounding with a short fade, so switching
// strings doesn't produce a click or let two notes ring at once.
export function stopNote(): void {
    if (currentSource && currentGain) {
        const context = getAudioContext();
        const now = context.currentTime;
        currentGain.gain.cancelScheduledValues(now);
        currentGain.gain.setValueAtTime(currentGain.gain.value, now);
        currentGain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
        try {
            currentSource.stop(now + RELEASE_SECONDS);
        } catch {
            // Already stopped.
        }
    }
    currentSource = null;
    currentGain = null;
}

export function playNote(frequency: number, volume: number = DEFAULT_VOLUME): void {
    const context = getAudioContext();
    stopNote();

    const source = context.createBufferSource();
    source.buffer = createPluckBuffer(context, frequency);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(toneLowpassFrequency(frequency), context.currentTime);
    filter.Q.setValueAtTime(0.7, context.currentTime);

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + ATTACK_SECONDS);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);

    source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
            currentGain = null;
        }
    };

    currentSource = source;
    currentGain = gainNode;
    source.start();
}
