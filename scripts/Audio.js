
// allows more things to be stored with an Audio element
export class AudioObject {
    /**
     * 
     * @param {HTMLAudioElement} audioElement - The Audio element
     * @param {Number} baseVolume - Base volume 0-1
     */
    constructor(name, audioElement, type='default', baseVolume=1, loops=undefined) {
        this.name = name ?? audioElement.src;
        this.audioElement = audioElement;
        this.baseVolume = baseVolume;
        this.type = type;
        if (type === 'bgm') {
            this.loops = loops ?? true

        } else {
            this.loops = loops ?? false
        }

        if (this.loops) {
            this.audioElement.loop = true;
        }
    }

    mute() {
        this.audioElement.volume = 0;
    }
    unmute() {
        this.audioElement.volume = this.baseVolume;
    }
    play() {
        this.audioElement.currentTime = 0;
        this.audioElement.play();
    }
    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
    }
}