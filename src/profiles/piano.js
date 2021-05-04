const profile = {
    name: 'piano',
    attack: () => 0.002,
    dampen: (sampleRate, frequency, volume) => (0.5 * Math.log(frequency * volume / sampleRate)) ** 2,
    wave: function (i, sampleRate, frequency) {
        const base = this.modulate[0];
        return this.modulate[1](
            i,
            sampleRate,
            frequency,
            base(i, sampleRate, frequency, 0) ** 2 +
                0.75 * base(i, sampleRate, frequency, 0.25) +
                0.1 * base(i, sampleRate, frequency, 0.5)
        );
    }
};

export default profile;
