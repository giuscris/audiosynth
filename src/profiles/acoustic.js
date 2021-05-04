const profile = {
    name: 'acoustic',
    attack: () => 0.002,
    dampen: () => 1,
    wave: function (i, sampleRate, frequency) {
        const lets = this.lets;

        lets.valueTable = !lets.valueTable ? [] : lets.valueTable;

        if (typeof lets.playVal === 'undefined') {
            lets.playVal = 0;
        }

        if (typeof lets.periodCount === 'undefined') {
            lets.periodCount = 0;
        }

        const valueTable = lets.valueTable;
        const playVal = lets.playVal;
        const periodCount = lets.periodCount;

        const period = sampleRate / frequency;
        const pHundredth = Math.floor((period - Math.floor(period)) * 100);

        let resetPlay = false;

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

        const result = valueTable[playVal];

        if (resetPlay) {
            lets.playVal = 0;
        } else {
            lets.playVal++;
        }

        return result;

    }
};

export default profile;
