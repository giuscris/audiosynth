var AudioSynth = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var profile$3 = {
    name: 'acoustic',
    attack: function attack() {
      return 0.002;
    },
    dampen: function dampen() {
      return 1;
    },
    wave: function wave(i, sampleRate, frequency) {
      var lets = this.lets;
      lets.valueTable = !lets.valueTable ? [] : lets.valueTable;

      if (typeof lets.playVal === 'undefined') {
        lets.playVal = 0;
      }

      if (typeof lets.periodCount === 'undefined') {
        lets.periodCount = 0;
      }

      var valueTable = lets.valueTable;
      var playVal = lets.playVal;
      var periodCount = lets.periodCount;
      var period = sampleRate / frequency;
      var pHundredth = Math.floor((period - Math.floor(period)) * 100);
      var resetPlay = false;

      if (valueTable.length <= Math.ceil(period)) {
        valueTable.push(Math.round(Math.random()) * 2 - 1);
        return valueTable[valueTable.length - 1];
      }

      valueTable[playVal] = (valueTable[playVal >= valueTable.length - 1 ? 0 : playVal + 1] + valueTable[playVal]) * 0.5;

      if (playVal >= Math.floor(period)) {
        if (playVal < Math.ceil(period)) {
          if (periodCount % 100 >= pHundredth) {
            resetPlay = true;
            valueTable[playVal + 1] = (valueTable[0] + valueTable[playVal + 1]) * 0.5;
            lets.periodCount++;
          }
        } else {
          resetPlay = true;
        }
      }

      var result = valueTable[playVal];

      if (resetPlay) {
        lets.playVal = 0;
      } else {
        lets.playVal++;
      }

      return result;
    }
  };

  var profile$2 = {
    name: 'edm',
    attack: function attack() {
      return 0.002;
    },
    dampen: function dampen() {
      return 1;
    },
    wave: function wave(i, sampleRate, frequency) {
      var base = this.modulate[0];
      var mod = this.modulate.slice(1);
      return mod[0](i, sampleRate, frequency, mod[9](i, sampleRate, frequency, mod[2](i, sampleRate, frequency, Math.pow(base(i, sampleRate, frequency, 0), 3) + Math.pow(base(i, sampleRate, frequency, 0.5), 5) + Math.pow(base(i, sampleRate, frequency, 1), 7))) + mod[8](i, sampleRate, frequency, base(i, sampleRate, frequency, 1.75)));
    }
  };

  var profile$1 = {
    name: 'organ',
    attack: function attack() {
      return 0.3;
    },
    dampen: function dampen(sampleRate, frequency) {
      return 1 + frequency * 0.01;
    },
    wave: function wave(i, sampleRate, frequency) {
      var base = this.modulate[0];
      return this.modulate[1](i, sampleRate, frequency, base(i, sampleRate, frequency, 0) + 0.5 * base(i, sampleRate, frequency, 0.25) + 0.25 * base(i, sampleRate, frequency, 0.5));
    }
  };

  var profile = {
    name: 'piano',
    attack: function attack() {
      return 0.002;
    },
    dampen: function dampen(sampleRate, frequency, volume) {
      return Math.pow(0.5 * Math.log(frequency * volume / sampleRate), 2);
    },
    wave: function wave(i, sampleRate, frequency) {
      var base = this.modulate[0];
      return this.modulate[1](i, sampleRate, frequency, Math.pow(base(i, sampleRate, frequency, 0), 2) + 0.75 * base(i, sampleRate, frequency, 0.25) + 0.1 * base(i, sampleRate, frequency, 0.5));
    }
  };

  var AudioSynthInstrument = /*#__PURE__*/function () {
    function AudioSynthInstrument(parent, name, soundID) {
      _classCallCheck(this, AudioSynthInstrument);

      this.parent = parent;
      this.name = name;
      this.soundID = soundID;
    }

    _createClass(AudioSynthInstrument, [{
      key: "play",
      value: function play(note, octave, duration) {
        return this.parent.play(this.soundID, note, octave, duration);
      }
    }, {
      key: "generate",
      value: function generate(note, octave, duration) {
        return this.parent.generate(this.soundID, note, octave, duration);
      }
    }]);

    return AudioSynthInstrument;
  }();

  var AudioSynth = /*#__PURE__*/function () {
    function AudioSynth() {
      _classCallCheck(this, AudioSynth);

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
      this.mod = [function (i, sampleRate, frequency, x) {
        return Math.sin(2 * Math.PI * (i / sampleRate) * frequency + x);
      }, function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(2 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(4 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(8 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(0.5 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 1 * Math.sin(0.25 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(2 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(4 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(8 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(0.5 * Math.PI * (i / sampleRate * frequency) + x);
      }, function (i, sampleRate, frequency, x) {
        return 0.5 * Math.sin(0.25 * Math.PI * (i / sampleRate * frequency) + x);
      }];
      this.loadSoundProfile(profile$3, profile$2, profile$1, profile);
    }

    _createClass(AudioSynth, [{
      key: "setSampleRate",
      value: function setSampleRate(rate) {
        this._sampleRate = Math.max(Math.min(Math.floor(rate), 44100), 4000);
        this.clearCache();
        return this._sampleRate;
      }
    }, {
      key: "getSampleRate",
      value: function getSampleRate() {
        return this._sampleRate;
      }
    }, {
      key: "setVolume",
      value: function setVolume() {
        var volume = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        volume = Math.trunc(volume * 32768);
        this._volume = Math.max(Math.min(Math.floor(volume), 32768), 0);
        this.clearCache();
        return this._volume;
      }
    }, {
      key: "getVolume",
      value: function getVolume() {
        return Math.round(this._volume / 32768 * 1e4) / 1e4;
      }
    }, {
      key: "clearCache",
      value: function clearCache() {
        this._dataCache = [];
      }
    }, {
      key: "generate",
      value: function generate(sound, note) {
        var octave = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
        var duration = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 2;

        if (typeof this.notes[note] === 'undefined') {
          throw new Error(note + ' is not a valid note.');
        }

        octave = Math.min(8, Math.max(1, octave));
        return this.generateFrequency(sound, this.notes[note] * Math.pow(2, octave - 4), duration);
      }
    }, {
      key: "generateFrequency",
      value: function generateFrequency(sound, frequency, duration) {
        var soundProfile = this._sounds[sound];

        if (!soundProfile) {
          for (var i = 0; i < this._sounds.length; i++) {
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

        if (typeof this._dataCache[cacheKey] !== 'undefined') {
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
          lets: this._temp
        };
        var attackLen = Math.floor(sampleRate * attack);
        var decayLen = Math.floor(sampleRate * duration);
        var val = 0;
        var data = new Uint8Array(new ArrayBuffer(Math.ceil(sampleRate * duration * 2)));

        for (var _i = 0; _i !== attackLen; _i++) {
          val = volume * (_i / (sampleRate * attack)) * waveFunc.call(waveBind, _i, sampleRate, frequency, volume);
          data[_i << 1] = val;
          data[(_i << 1) + 1] = val >> 8;
        }

        for (var _i2 = attackLen; _i2 !== decayLen; _i2++) {
          var base = 1 - (_i2 - sampleRate * attack) / (sampleRate * (duration - attack));
          val = volume * Math.pow(base, dampen) * waveFunc.call(waveBind, _i2, sampleRate, frequency, volume);
          data[_i2 << 1] = val;
          data[(_i2 << 1) + 1] = val >> 8;
        }

        var pack = function pack(c, arg) {
          return [new Uint8Array([arg, arg >> 8]), new Uint8Array([arg, arg >> 8, arg >> 16, arg >> 24])][c];
        };

        var out = ['RIFF', pack(1, 4 + (8 + 24
        /* chunk 1 length */
        ) + (8 + 8
        /* chunk 2 length */
        )), // Length
        'WAVE', // chunk 1
        'fmt ', // Sub-chunk identifier
        pack(1, 16), // Chunk length
        pack(0, 1), // Audio format (1 is linear quantization)
        pack(0, channels), pack(1, sampleRate), pack(1, sampleRate * channels * bitsPerSample / 8), // Byte rate
        pack(0, channels * bitsPerSample / 8), pack(0, bitsPerSample), // chunk 2
        'data', // Sub-chunk identifier
        pack(1, data.length * channels * bitsPerSample / 8), // Chunk length
        data];
        var blob = new Blob(out, {
          type: 'audio/wav'
        });
        var dataURI = URL.createObjectURL(blob);
        this._dataCache[cacheKey] = dataURI;

        if (this._debugMode) {
          console.log(new Date() - initTime, 'ms to generate');
        }

        return dataURI;
      }
    }, {
      key: "play",
      value: function play(sound, note, octave, duration) {
        var audio = new Audio(this.generate(sound, note, octave, duration));
        audio.play();
        return true;
      }
    }, {
      key: "playFrequency",
      value: function playFrequency(sound, frequency, duration) {
        var audio = new Audio(this.generateFrequency(sound, frequency, duration));
        audio.play();
        return true;
      }
    }, {
      key: "debug",
      value: function debug() {
        this._debugMode = true;
      }
    }, {
      key: "createInstrument",
      value: function createInstrument(sound) {
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

        return new AudioSynthInstrument(this, sound, n);
      }
    }, {
      key: "listSounds",
      value: function listSounds() {
        var r = [];

        for (var i = 0; i < this._sounds.length; i++) {
          r.push(this._sounds[i].name);
        }

        return r;
      }
    }, {
      key: "loadSoundProfile",
      value: function loadSoundProfile() {
        for (var i = 0, len = arguments.length; i < len; i++) {
          var o = i < 0 || arguments.length <= i ? undefined : arguments[i];

          if (!(o instanceof Object)) {
            throw new Error('Invalid sound profile.');
          }

          this._sounds.push(o);
        }

        return true;
      }
    }, {
      key: "loadModulationFunction",
      value: function loadModulationFunction() {
        for (var i = 0, len = arguments.length; i < len; i++) {
          var f = i < 0 || arguments.length <= i ? undefined : arguments[i];

          if (typeof f !== 'function') {
            throw new Error('Invalid modulation function.');
          }

          this.mod.push(f);
        }

        return true;
      }
    }]);

    return AudioSynth;
  }();

  return AudioSynth;

}());
