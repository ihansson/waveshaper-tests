"use strict";

const semiTone = 1.059463094359

function getLetterDistanceFromA(letter){
    const distances = {
        'a' : 0,
        'a#' : 1,
        'b' : 2,
        'c' : 3,
        'c#' : 4,
        'd' : 5,
        'd#' : 6,
        'e' : -5,
        'f' : -4,
        'f#' : -3,
        'g' : -2,
        'g#' : -1
    };
    return distances[letter]
}

function shiftFrequencyOctave(freq, octave){
    return freq * Math.pow(semiTone, octave * 12)
}

function calculateFrequencyFromLetter(letter){
    const distance = getLetterDistanceFromA(letter.replace(/[0-9]/g, ''))
    let freq = 440 * Math.pow(semiTone, distance)

    const octave = letter.match(/\d+/)
    if(octave){
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
        this.Context = this.options.context || createTonePlayerContext()
    },
    playNote: function(note, options) {

        if (!options) options = {}

        const Context = this.Context

        const gainNode = Context.createGain()
        gainNode.gain.setValueAtTime(0, Context.currentTime)

        const startTime = Context.currentTime + (options.delay || this.options.defaultDelay)


        const attack = options.attack || this.options.defaultAttack
        const volume = options.volume || this.options.defaultVolume;

        if (attack === 0) {
            gainNode.gain.setValueAtTime(volume, startTime);
        } else {
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
        }

        gainNode.connect(Context.destination)

        const oscillator = Context.createOscillator();
        oscillator.type = options.type || this.options.defaultType;
        oscillator.frequency.setValueAtTime(calculateFrequencyFromLetter(note), startTime);
        oscillator.connect(gainNode)
        oscillator.start();

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

        oscillator.onended = () => {
            gainNode.disconnect(Context.destination)
            oscillator.disconnect(gainNode)
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

keyboard.playChord(['a','c','e'],{
});

keyboard.playChord(['e','g','a'],{
    delay: 1
});