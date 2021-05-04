const profile = {
    name: 'edm',
    attack: () => 0.002,
    dampen: () => 1,
    wave: function (i, sampleRate, frequency) {
        const base = this.modulate[0];
        const mod = this.modulate.slice(1);
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
                    base(i, sampleRate, frequency, 0) ** 3 +
                    base(i, sampleRate, frequency, 0.5) ** 5 +
                    base(i, sampleRate, frequency, 1) ** 7
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
};

export default profile;
