const profile = {
    name: 'organ',
    attack: () => 0.3,
    dampen: (sampleRate, frequency) => 1 + frequency * 0.01,
    wave: function (i, sampleRate, frequency) {
        const base = this.modulate[0];
        return this.modulate[1](
            i,
            sampleRate,
            frequency,
            base(i, sampleRate, frequency, 0) +
                0.5 * base(i, sampleRate, frequency, 0.25) +
                0.25 * base(i, sampleRate, frequency, 0.5)
        );
    }
};

export default profile;
