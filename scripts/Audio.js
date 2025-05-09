
// allows more things to be stored with an Audio element
export class AudioObject {
    /**
     * 
     * @param {HTMLAudioElement} audioElement - The Audio element
     * @param {Number} baseVolume - Base volume 0-1
     */
    constructor(name, audioElement, type='default', baseVolume=1, loops=undefined, controller) {
        this.name = name ?? audioElement.src;
        this.audioElement = audioElement;
        this.baseVolume = baseVolume;
        this.controller = controller
        this.volumeMulti = 1;
        this.pitch = 1;
        this.type = type;
        this.muted = false;
        this.audioElement.preservesPitch = false;
        if (type === 'bgm') {
            this.loops = loops ?? true

        } else {
            this.loops = loops ?? false
        }

        if (this.loops) {
            this.audioElement.loop = true;
        }
    }

    play(volume, pitch) {
        this.volumeMulti = volume ?? 1;
        this.pitch = pitch ?? 1;
        this.audioElement.currentTime = 0;
        this.audioElement.volume = this.baseVolume * this.volumeMulti * this.controller.volume.value;
        this.audioElement.playbackRate = this.pitch;
        this.audioElement.play();
    }
    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
    }

    update() {
        this.audioElement.volume = this.baseVolume * this.volumeMulti * this.controller.volume.value;
        this.audioElement.playbackRate = this.pitch;
    }
}