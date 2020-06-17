var Synth, AudioSynth, AudioSynthInstrument;

!function () {
    var URL = window.URL || window.webkitURL;

    var Blob = window.Blob;

    if (!URL || !Blob) {
        throw new Error('This browser does not support AudioSynth');
    }

    var isEncapsulated = false;

    var AudioSynthInstance = null;

    var pack = function (c, arg) {
        return [new Uint8Array([arg, arg >> 8]), new Uint8Array([arg, arg >> 8, arg >> 16, arg >> 24])][c];
    };

    AudioSynthInstrument = function () {
        this.init.apply(this, arguments);
    };

    AudioSynthInstrument.prototype.init = function (parent, name, soundID) {
        if (!isEncapsulated) {
            throw new Error('AudioSynthInstrument can only be instantiated from the createInstrument method of the AudioSynth object.');
        }
        this.parent = parent;
        this.name = name;
        this.soundID = soundID;
    };

    AudioSynthInstrument.prototype.play = function (note, octave, duration) {
        return this.parent.play(this.soundID, note, octave, duration);
    };

    AudioSynthInstrument.prototype.generate = function (note, octave, duration) {
        return this.parent.generate(this.soundID, note, octave, duration);
    };

    AudioSynth = function () {
        if (AudioSynthInstance instanceof AudioSynth) {
            return AudioSynthInstance;
        }
        return this;
    };

    AudioSynth.prototype._debugMode = false;

    AudioSynth.prototype._bitsPerSample = 16;

    AudioSynth.prototype._channels = 1;

    AudioSynth.prototype._sampleRate = 44100;

    AudioSynth.prototype._volume = 32768;

    AudioSynth.prototype._dataCache = [];

    AudioSynth.prototype._temp = {};

    AudioSynth.prototype._sounds = [];

    AudioSynth.prototype.notes = {
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

    AudioSynth.prototype.setSampleRate = function (rate) {
        this._sampleRate = Math.max(Math.min(Math.floor(rate), 44100), 4000);
        this.clearCache();
        return this._sampleRate;
    };

    AudioSynth.prototype.getSampleRate = function () {
        return this._sampleRate;
    };

    AudioSynth.prototype.setVolume = function (volume = 0) {
        volume = Math.trunc(volume * 32768);
        this._volume = Math.max(Math.min(Math.floor(volume), 32768), 0);
        this.clearCache();
        return this._volume;
    };

    AudioSynth.prototype.getVolume = function () {
        return Math.round(this._volume / 32768 * 1e4) / 1e4;
    };

    AudioSynth.prototype.mod = [function (i, sampleRate, frequency, x) {
        return Math.sin((2 * Math.PI) * (i / sampleRate) * frequency + x);
    }];

    AudioSynth.prototype.clearCache = function () {
        this._dataCache = [];
    };

    AudioSynth.prototype.generate = function (sound, note, octave = 0, duration = 2) {
        if (typeof (this.notes[note]) === 'undefined') {
            throw new Error(note + ' is not a valid note.');
        }
        octave = Math.min(8, Math.max(1, octave));
        var frequency = this.notes[note] * Math.pow(2, octave - 4);
        this.notes[note] * Math.pow(2, octave - 4);
        return this.generateFrequency(sound, frequency, duration);
    };

    AudioSynth.prototype.generateFrequency = function (sound, frequency, duration) {
        var i = 0;
        var soundProfile = this._sounds[sound];

        if (!soundProfile) {
            for (i = 0; i < this._sounds.length; i++) {
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

        var initTime = new Date();
        var cacheKey = Array.prototype.join.call(arguments, ':');

        if (typeof (this._dataCache[cacheKey]) !== 'undefined') {
            if (this._debugMode) {
                console.log(new Date() - initTime, 'ms to retrieve (cached)');
            }
            return this._dataCache[cacheKey];
        }

        var sampleRate = this._sampleRate;
        var volume = this._volume;
        var channels = this._channels;
        var bitsPerSample = this._bitsPerSample;
        var attack = soundProfile.attack(sampleRate, frequency, volume);
        var dampen = soundProfile.dampen(sampleRate, frequency, volume);
        var waveFunc = soundProfile.wave;

        var waveBind = {
            modulate: this.mod,
            vars: this._temp
        };

        var val = 0;
        var data = new Uint8Array(new ArrayBuffer(Math.ceil(sampleRate * duration * 2)));
        var attackLen = Math.floor(sampleRate * attack);
        var decayLen = Math.floor(sampleRate * duration);

        for (i = 0; i !== attackLen; i++) {
            val = volume * (i / (sampleRate * attack)) * waveFunc.call(waveBind, i, sampleRate, frequency, volume);
            data[i << 1] = val;
            data[(i << 1) + 1] = val >> 8;
        }

        for (i = attackLen; i !== decayLen; i++) {
            var base = 1 - ((i - (sampleRate * attack)) / (sampleRate * (duration - attack)));
            val = volume * Math.pow(base, dampen) * waveFunc.call(waveBind, i, sampleRate, frequency, volume);
            data[i << 1] = val;
            data[(i << 1) + 1] = val >> 8;
        }

        var out = [
            'RIFF',
            pack(1, 4 + (8 + 24 /* chunk 1 length */ ) + (8 + 8 /* chunk 2 length */ )), // Length
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

        var blob = new Blob(out, {type: 'audio/wav'});
        var dataURI = URL.createObjectURL(blob);

        this._dataCache[cacheKey] = dataURI;

        if (this._debugMode) {
            console.log(new Date() - initTime, 'ms to generate');
        }

        return dataURI;
    };

    AudioSynth.prototype.play = function (sound, note, octave, duration) {
        var audio = new Audio(this.generate(sound, note, octave, duration));
        audio.play();
        return true;
    };

    AudioSynth.prototype.playFrequency = function (sound, frequency, duration) {
        var audio = new Audio(this.generateFrequency(sound, frequency, duration));
        audio.play();
        return true;
    };

    AudioSynth.prototype.debug = function () {
        this._debugMode = true;
    };

    AudioSynth.prototype.createInstrument = function (sound) {
        var n = 0;

        var found = false;

        if (typeof sound === 'string') {
            for (var i = 0; i < this._sounds.length; i++) {
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

        isEncapsulated = true;
        var instrument = new AudioSynthInstrument(this, sound, n);
        isEncapsulated = false;

        return instrument;
    };

    AudioSynth.prototype.listSounds = function () {
        var r = [];
        for (var i = 0; i < this._sounds.length; i++) {
            r.push(this._sounds[i].name);
        }
        return r;
    };

    AudioSynth.prototype.loadSoundProfile = function () {
        for (var i = 0, len = arguments.length; i < len; i++) {
            var o = arguments[i];

            if (!(o instanceof Object)) {
                throw new Error('Invalid sound profile.');
            }

            this._sounds.push(o);
        }

        return true;
    };

    AudioSynth.prototype.loadModulationFunction = function () {
        for (var i = 0, len = arguments.length; i < len; i++) {

            var f = arguments[i];

            if (typeof (f) !== 'function') {
                throw new Error('Invalid modulation function.');
            }

            this.mod.push(f);
        }

        return true;
    };

    Synth = AudioSynthInstance = new AudioSynth();

}();

Synth.loadModulationFunction(
    function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(2 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(4 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(8 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(0.5 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(0.25 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(2 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(4 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(8 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(0.5 * Math.PI * ((i / sampleRate) * frequency) + x);
    },
    function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(0.25 * Math.PI * ((i / sampleRate) * frequency) + x);
    }
);

Synth.loadSoundProfile({
    name: 'piano',
    attack: function () {
        return 0.002;
    },
    dampen: function (sampleRate, frequency, volume) {
        return Math.pow(0.5 * Math.log((frequency * volume) / sampleRate), 2);
    },
    wave: function (i, sampleRate, frequency) {
        var base = this.modulate[0];
        return this.modulate[1](
            i,
            sampleRate,
            frequency,
            Math.pow(base(i, sampleRate, frequency, 0), 2) +
                0.75 * base(i, sampleRate, frequency, 0.25) +
                0.1 * base(i, sampleRate, frequency, 0.5)
        );
    }
}, {
    name: 'organ',
    attack: function () {
        return 0.3;
    },
    dampen: function (sampleRate, frequency) {
        return 1 + (frequency * 0.01);
    },
    wave: function (i, sampleRate, frequency) {
        var base = this.modulate[0];
        return this.modulate[1](
            i,
            sampleRate,
            frequency,
            base(i, sampleRate, frequency, 0) +
                0.5 * base(i, sampleRate, frequency, 0.25) +
                0.25 * base(i, sampleRate, frequency, 0.5)
        );
    }
}, {
    name: 'acoustic',
    attack: function () {
        return 0.002;
    },
    dampen: function () {
        return 1;
    },
    wave: function (i, sampleRate, frequency) {
        var vars = this.vars;

        vars.valueTable = !vars.valueTable ? [] : vars.valueTable;

        if (typeof (vars.playVal) === 'undefined') {
            vars.playVal = 0;
        }

        if (typeof (vars.periodCount) === 'undefined') {
            vars.periodCount = 0;
        }

        var valueTable = vars.valueTable;
        var playVal = vars.playVal;
        var periodCount = vars.periodCount;

        var period = sampleRate / frequency;
        var pHundredth = Math.floor((period - Math.floor(period)) * 100);

        var resetPlay = false;

        if (valueTable.length <= Math.ceil(period)) {
            valueTable.push(Math.round(Math.random()) * 2 - 1);
            return valueTable[valueTable.length - 1];
        }

        valueTable[playVal] = (valueTable[playVal >= (valueTable.length - 1) ? 0 : playVal + 1] + valueTable[playVal]) * 0.5;

        if (playVal >= Math.floor(period)) {
            if (playVal < Math.ceil(period)) {
                if ((periodCount % 100) >= pHundredth) {
                    resetPlay = true;
                    valueTable[playVal + 1] = (valueTable[0] + valueTable[playVal + 1]) * 0.5;
                    vars.periodCount++;
                }
            } else {
                resetPlay = true;
            }
        }

        var result = valueTable[playVal];

        if (resetPlay) {
            vars.playVal = 0;
        } else {
            vars.playVal++;
        }

        return result;

    }
}, {
    name: 'edm',
    attack: function () {
        return 0.002;
    },
    dampen: function () {
        return 1;
    },
    wave: function (i, sampleRate, frequency) {
        var base = this.modulate[0];
        var mod = this.modulate.slice(1);
        return mod[0](
            i,
            sampleRate,
            frequency,
            mod[9](
                i,
                sampleRate,
                frequency,
                mod[2](
                    i,
                    sampleRate,
                    frequency,
                    Math.pow(base(i, sampleRate, frequency, 0), 3) +
                    Math.pow(base(i, sampleRate, frequency, 0.5), 5) +
                    Math.pow(base(i, sampleRate, frequency, 1), 7)
                )
            ) +
            mod[8](
                i,
                sampleRate,
                frequency,
                base(i, sampleRate, frequency, 1.75)
            )
        );
    }
});
