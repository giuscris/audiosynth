import {babel} from '@rollup/plugin-babel';

const config = {
    input: 'src/audiosynth.js',
    output: {
        file: 'audiosynth.js',
        format: 'iife',
        name: 'AudioSynth'
    },
    plugins: [babel({ babelHelpers: 'bundled' })]
};

export default config;
