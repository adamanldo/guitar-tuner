// Synthesizes a plucked guitar string using the Karplus-Strong algorithm:
// a noise burst is repeatedly averaged and fed back through a short delay
// line, which is what gives it a decaying, string-like timbre instead of a
// flat tone.
const PLUCK_DURATION_SECONDS = 2.5;
const STRING_DECAY = 0.996;
const DEFAULT_VOLUME = 0.8;
const RELEASE_SECONDS = 0.05;

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;

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

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(volume, context.currentTime);

    source.connect(gainNode);
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
