import acousticProfile from './profiles/acoustic.js';
import edmProfile from './profiles/edm.js';
import organProfile from './profiles/organ.js';
import pianoProfile from './profiles/piano.js';

class AudioSynthInstrument {
    constructor(parent, name, soundID) {
        this.parent = parent;
        this.name = name;
        this.soundID = soundID;
    }

    play(note, octave, duration) {
        return this.parent.play(this.soundID, note, octave, duration);
    }

    playFrequency(frequency, duration) {
        return this.parent.playFrequency(this.soundID, frequency, duration);
    }

    generate(note, octave, duration) {
        return this.parent.generate(this.soundID, note, octave, duration);
    }

    generateFrequency(frequency, duration) {
        return this.parent.generateFrequency(this.soundID, frequency, duration);
    }
}

class AudioSynth {
    constructor() {
        this._debugMode = false;

        this._bitsPerSample = 16;

        this._channels = 1;

        this._sampleRate = 44100;

        this._volume = 32768;

        this._dataCache = [];

        this._temp = {};

        this._sounds = [];

        this.notes = {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        };

        this.mod = [
            (i, sampleRate, frequency, x) => Math.sin(2 * Math.PI * (i / sampleRate) * frequency + x),
            (i, sampleRate, frequency, x) => 1 * Math.sin(2 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 1 * Math.sin(4 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 1 * Math.sin(8 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 1 * Math.sin(0.5 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 1 * Math.sin(0.25 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 0.5 * Math.sin(2 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 0.5 * Math.sin(4 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 0.5 * Math.sin(8 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 0.5 * Math.sin(0.5 * Math.PI * (i / sampleRate * frequency) + x),
            (i, sampleRate, frequency, x) => 0.5 * Math.sin(0.25 * Math.PI * (i / sampleRate * frequency) + x)
        ];

        this.loadSoundProfile(
            acousticProfile,
            edmProfile,
            organProfile,
            pianoProfile
        );
    }

    setSampleRate(rate) {
        this._sampleRate = Math.max(Math.min(Math.floor(rate), 44100), 4000);
        this.clearCache();
        return this._sampleRate;
    }

    getSampleRate() {
        return this._sampleRate;
    }

    setVolume(volume = 0) {
        volume = Math.trunc(volume * 32768);
        this._volume = Math.max(Math.min(Math.floor(volume), 32768), 0);
        this.clearCache();
        return this._volume;
    }

    getVolume() {
        return Math.round(this._volume / 32768 * 1e4) / 1e4;
    }

    clearCache() {
        this._dataCache = [];
    }

    generate(sound, note, octave = 0, duration = 2) {
        if (typeof this.notes[note] === 'undefined') {
            throw new Error(note + ' is not a valid note.');
        }
        octave = Math.min(8, Math.max(1, octave));
        return this.generateFrequency(sound, this.notes[note] * 2 ** (octave - 4), duration);
    }

    generateFrequency(sound, frequency, duration) {
        let soundProfile = this._sounds[sound];

        if (!soundProfile) {
            for (let i = 0; i < this._sounds.length; i++) {
                if (this._sounds[i].name === sound) {
                    soundProfile = this._sounds[i];
                    sound = i;
                    break;
                }
            }
        }

        if (!soundProfile) {
            throw new Error('Invalid sound or sound ID: ' + sound);
        }

        this._temp = {};

        const initTime = new Date();
        const cacheKey = Array.prototype.join.call(arguments, ':');

        if (typeof this._dataCache[cacheKey] !== 'undefined') {
            if (this._debugMode) {
                console.log(new Date() - initTime, 'ms to retrieve (cached)');
            }
            return this._dataCache[cacheKey];
        }

        const sampleRate = this._sampleRate;
        const volume = this._volume;
        const channels = this._channels;
        const bitsPerSample = this._bitsPerSample;
        const attack = soundProfile.attack(sampleRate, frequency, volume);
        const dampen = soundProfile.dampen(sampleRate, frequency, volume);
        const waveFunc = soundProfile.wave;

        const waveBind = {
            modulate: this.mod,
            lets: this._temp
        };

        const attackLen = Math.floor(sampleRate * attack);
        const decayLen = Math.floor(sampleRate * duration);

        let val = 0;
        let data = new Uint8Array(new ArrayBuffer(Math.ceil(sampleRate * duration * 2)));

        for (let i = 0; i !== attackLen; i++) {
            val = volume * (i / (sampleRate * attack)) * waveFunc.call(waveBind, i, sampleRate, frequency, volume);
            data[i << 1] = val;
            data[(i << 1) + 1] = val >> 8;
        }

        for (let i = attackLen; i !== decayLen; i++) {
            let base = 1 - (i - sampleRate * attack) / (sampleRate * (duration - attack));
            val = volume * base ** dampen * waveFunc.call(waveBind, i, sampleRate, frequency, volume);
            data[i << 1] = val;
            data[(i << 1) + 1] = val >> 8;
        }

        const pack = (c, arg) => [new Uint8Array([arg, arg >> 8]), new Uint8Array([arg, arg >> 8, arg >> 16, arg >> 24])][c];

        const out = [
            'RIFF',
            pack(1, 4 + (8 + 24 /* chunk 1 length */) + (8 + 8 /* chunk 2 length */)), // Length
            'WAVE',
            // chunk 1
            'fmt ', // Sub-chunk identifier
            pack(1, 16), // Chunk length
            pack(0, 1), // Audio format (1 is linear quantization)
            pack(0, channels),
            pack(1, sampleRate),
            pack(1, sampleRate * channels * bitsPerSample / 8), // Byte rate
            pack(0, channels * bitsPerSample / 8),
            pack(0, bitsPerSample),
            // chunk 2
            'data', // Sub-chunk identifier
            pack(1, data.length * channels * bitsPerSample / 8), // Chunk length
            data
        ];

        const blob = new Blob(out, {type: 'audio/wav'});
        const dataURI = URL.createObjectURL(blob);

        this._dataCache[cacheKey] = dataURI;

        if (this._debugMode) {
            console.log(new Date() - initTime, 'ms to generate');
        }

        return dataURI;
    }

    play(sound, note, octave, duration) {
        const audio = new Audio(this.generate(sound, note, octave, duration));
        audio.play();
        return true;
    }

    playFrequency(sound, frequency, duration) {
        const audio = new Audio(this.generateFrequency(sound, frequency, duration));
        audio.play();
        return true;
    }

    debug() {
        this._debugMode = true;
    }

    createInstrument(sound) {
        let n = 0;

        let found = false;

        if (typeof sound === 'string') {
            for (let i = 0; i < this._sounds.length; i++) {
                if (this._sounds[i].name === sound) {
                    found = true;
                    n = i;
                    break;
                }
            }
        } else if (this._sounds[sound]) {
            n = sound;
            sound = this._sounds[n].name;
            found = true;
        }

        if (!found) {
            throw new Error('Invalid sound or sound ID: ' + sound);
        }

        return new AudioSynthInstrument(this, sound, n);
    }

    listSounds() {
        let r = [];
        for (let i = 0; i < this._sounds.length; i++) {
            r.push(this._sounds[i].name);
        }
        return r;
    }

    loadSoundProfile(...args) {
        for (let i = 0, len = args.length; i < len; i++) {
            let o = args[i];

            if (!(o instanceof Object)) {
                throw new Error('Invalid sound profile.');
            }

            this._sounds.push(o);
        }

        return true;
    }

    loadModulationFunction(...args) {
        for (let i = 0, len = args.length; i < len; i++) {

            let f = args[i];

            if (typeof f !== 'function') {
                throw new Error('Invalid modulation function.');
            }

            this.mod.push(f);
        }

        return true;
    }
}

export default AudioSynth;
