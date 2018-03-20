"use strict";

const semiTone = 1.059463094359

function getLetterDistanceFromA(letter) {
    const distances = {
        'a': 0,
        'a#': 1,
        'b': 2,
        'c': 3,
        'c#': 4,
        'd': 5,
        'd#': 6,
        'e': -5,
        'f': -4,
        'f#': -3,
        'g': -2,
        'g#': -1
    };
    return distances[letter]
}

function shiftFrequencyOctave(freq, octave) {
    return freq * Math.pow(semiTone, octave * 12)
}

function calculateFrequencyFromLetter(letter) {
    const distance = getLetterDistanceFromA(letter.replace(/[0-9]/g, ''))
    let freq = 440 * Math.pow(semiTone, distance)

    const octave = letter.match(/\d+/)
    if (octave) {
        freq = shiftFrequencyOctave(freq, octave - 4)
    }
    return freq
}

const TonePlayer = {
    defaultOptions: {
        defaultType: 'sine',
        defaultVolume: 0.5,
        defaultDuration: 0.5,
        defaultDelay: 0,
        defaultAttack: 0,
        defaultDecay: 0,
        defaultDistortion: 0,
    },
    create: function(args) {
        const player = Object.create(this);
        player.init(args)
        return player
    },
    init: function(args) {
        this.options = Object.assign({}, this.defaultOptions, args || {});
        this.defaultType = this.options.defaultType
        this.defaultVolume = this.options.defaultVolume
        this.defaultDuration = this.options.defaultDuration
        this.defaultAttack = this.options.defaultAttack
        this.defaultDecay = this.options.defaultDecay
        this.defaultDistortion = this.options.defaultDistortion
        this.Context = this.options.context || createTonePlayerContext()
    },
    playNote: function(note, options) {

        if (!options) options = {}

        const Context = this.Context

        const gainNode = Context.createGain()
        gainNode.gain.setValueAtTime(0, Context.currentTime)

        const startTime = Context.currentTime + (options.delay || this.options.defaultDelay)

        const attack = options.attack || this.options.defaultAttack
        let volume = options.volume || this.options.defaultVolume

        const distortion = options.distortion || this.options.defaultDistortion

        if (attack === 0) {
            gainNode.gain.setValueAtTime(volume, startTime);
        } else {
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
        }

        let pulseCurve = new Float32Array(256);
        for (var i = 0; i < 128; i++) {
            pulseCurve[i] = -0.8;
            pulseCurve[i + 128] = .8;
        }
        const waveShaperNode = Context.createWaveShaper();
        // waveShaperNode.curve = pulseCurve;
        waveShaperNode.curve = makeDistortionCurve(distortion);
        waveShaperNode.oversample = '4x';

        const oscillator = Context.createOscillator();
        oscillator.type = options.type || this.options.defaultType;
        oscillator.frequency.setValueAtTime(calculateFrequencyFromLetter(note), startTime);
        oscillator.connect(gainNode)
        oscillator.start();

        gainNode.connect(waveShaperNode)

        waveShaperNode.connect(Context.destination)

        const duration = options.duration || this.options.defaultDuration;
        const endTime = startTime + duration;
        const decay = options.decay || this.options.defaultDecay

        if (decay === 0) {
            oscillator.stop(endTime)
        } else {
            gainNode.gain.setValueAtTime(volume, endTime);
            gainNode.gain.linearRampToValueAtTime(0, endTime + decay);
            oscillator.stop(endTime + decay)
        }

    },
    playNotes: function(notes, options) {

        if (!options) options = {}
        if (!options.distance) options.distance = 0.5

        let primaryDelay = (options.delay || 0)
        let itterator = 0;

        notes.forEach(note => {
            let noteOptions = options
            noteOptions.delay = (options.distance * itterator) + primaryDelay
            this.playNote(note, noteOptions)
            itterator++;
        })

    },
    playChord: function(notes, options) {

        if (!options) options = {}

        notes.forEach(note => {
            this.playNote(note, options)
        })

    }
}

function makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for (; i < n_samples; ++i) {
        x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
};

const createTonePlayerContext = () => {
    return new(window.AudioContext || window.webkitAudioContext)();
}

const context = createTonePlayerContext();

const keyboard = TonePlayer.create({
    defaultType: 'sawtooth',
    defaultVolume: 0.1,
    defaultDuration: 1,
    defaultDecay: 0.1,
    defaultAttack: 0.5,
    context: context
});

keyboard.playChord(['a', 'c', 'e'], {
    distortion: 25500
});

keyboard.playChord(['e', 'g', 'a'], {
    delay: 1
});