# 🎹 audiosynth
__Dynamic waveform audio synthesizer, written in JavaScript.__

ℹ️ __This work is a rewriting of [keithwor/audiosynth](https://github.com/keithwhor/audiosynth) by Keith Horwood using modern modular syntax and adding methods to play and generate arbitrary frequencies.__

## Usage
Assuming audiosynth.js is in your current directory, import package with:

```html
<script src="audiosynth.js"></script>
```

The rewritten code defines the class `AudioSynth` without creating the global object `Synth` as before. Now you have to create an instance:

```javascript
let Synth = new Synth();
```

You can use `AudioSynth` to generate .WAV files with `Synth.generate()` or `Synth.generateFrequency()`:

```javascript
/*
	sound
		a numeric index or string referring to a sound profile

	note
		the note you wish to play (A, B, C, D, E, F, G).
		Supports sharps (i.e. C#) but not flats.

	octave
		the octave # of the note you wish to play

	duration
		the duration (in seconds) of the note
*/
Synth.generate(sound, note, octave, duration);

/*
	sound
		a numeric index or string referring to a sound profile

	frequency
		the frequency of the sound you wish to play

	duration
		the duration (in seconds) of the note
*/
Synth.generateFrequency(sound, frequency, duration);
```

The latter method is more flexible because lets you enter the exact frequency you want. The following line of code will generate a base64-encoded two seconds long 440 Hz wavefile using the piano sound profile:

```javascript
Synth.generateFrequency('piano', 440, 2);
```

Just like the original [keithwor/audiosynth](https://github.com/keithwhor/audiosynth) you can also specify a note and an octave instead of the second argument:

```javascript
Synth.generate(sound, note, octave, duration);
```

You can play notes instantly using the following methods:

```javascript
Synth.play(sound, note, octave, duration);
Synth.playFrequency(sound, frequency, duration);
```

## Sound Profiles
`AudioSynth` comes with four default sound profiles (⚠️ the ids were changed from the original implementation, now they're sorted alphabetically):

- __acoustic__ (id 0)
- __edm__ (id 1)
- __organ__ (id 2)
- __piano__ (id 3)

## Changing Settings
Poor performance? The default sampling rate for AudioSynth is 44100Hz (CD quality). This can be taxing on your browser.

To change the sampling rate, use `Synth.setSampleRate(n)`. Please note that lower sampling rates will equate to poorer sound quality, especially for higher notes.

```javascript
// Can only set values between 4000Hz and 44100Hz.
Synth.setSampleRate(20000); // sets sample rate to 20000Hz

Synth.getSampleRate(); // returns 20000
```

Volume a bit much? Adust the volume of the sample similarly.

```javascript
Synth.setVolume(1.00); // set volume to 100%
Synth.setVolume(0.40); // no, wait, 40%.
Synth.setVolume(0.1337); // even better.

Synth.getVolume(); // returns 0.1337
```

## Advanced Usage
Additional sound profiles can be loaded using `Synth.loadSoundProfile()`

```javascript
// Load a sound profile from an object...
Synth.loadSoundProfile({
	// name it
	name: 'my_sound',
	// WIP: return the length of time, in seconds, the attack lasts
	attack: function(sampleRate, frequency, volume) { ... },
	// WIP: return a number representing the rate of signal decay.
	// larger = faster decay
	dampen: function(sampleRate, frequency, volume) { ... },
	// wave function: calculate the amplitude of your sine wave based on i (index)
	wave: function(i, sampleRate, frequency, volume) {
		/*
		Here we have access to...
		this.modulate : an array of loaded frequency
		this.vars : any temporary variables you wish to keep track of
		*/
	}

});
```

A rough guide to waveform generation can be found at http://keithwhor.com/music/

## Debugging

If you're hanging on note generation (for default or custom sound profiles), use `Synth.debug()` to enable debugging.
This will log note generation times in your console.

## Credits and Acknowledgements
Special thanks to Albert Pham (http://www.sk89q.com/) for Dynamic .WAV file generation, the work off of which this is based (http://www.sk89q.com/playground/jswav/) and Hasen el Judy (http://dev.hasenj.org/post/4517734448) for information regarding Karplus-Strong String Synthesis.


## Further Reading
__.WAV Audio Files__
http://en.wikipedia.org/wiki/.WAV_file


__Sound Synthesis__
http://www.acoustics.salford.ac.uk/acoustics_info/sound_synthesis/


__"acoustic" sound profile__ generated using __Karplus-Strong String Synthesis__:
http://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis
http://music.columbia.edu/cmc/musicandcomputers/chapter4/04_09.php
