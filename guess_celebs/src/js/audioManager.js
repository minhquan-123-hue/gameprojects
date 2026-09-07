/**
 * audioManager.js
 * Quản lý tất cả audio assets của game
 * 
 * Trách nhiệm riêng biệt:
 * - Load và play audio files
 * - Quản lý tất cả sound effects
 * - Không can thiệp vào logic game
 */

const RESULT_AUDIO_BY_INDEX = Object.freeze({
    0: 'cum_fast',
    1: 'dream_cum',
    2: 'half_ass',
    3: 'cum_pant',
    4: 'an_ba_to_cum',
    5: 'king_cum'
});

class AudioManager {
    constructor() {
        this.sounds = {};
        this.init();
    }

    /**
     * Khởi tạo và load tất cả audio assets
     * Base path: ../assets/audio/
     */
    init() {
        // Định nghĩa tất cả sound assets
        const audioAssets = {
            wrong: '../assets/audio/wrong.wav',      // Wrong answer
            right: '../assets/audio/right.wav',      // Correct answer
            gameplay: '../assets/audio/jazz.wav',    // Gameplay start
            cum_fast: '../assets/audio/cum_fast.wav',
            dream_cum: '../assets/audio/dream_cum.wav',
            half_ass: '../assets/audio/half_ass.wav',
            cum_pant: '../assets/audio/cum_pant.wav',
            an_ba_to_cum: '../assets/audio/an_ba_to_cum.wav',
            king_cum: '../assets/audio/king_cum.wav'
        };

        // Load tất cả audio files
        for (const [key, path] of Object.entries(audioAssets)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            if (key === 'gameplay') audio.loop = true;
            this.sounds[key] = audio;
        }

        console.log('AudioManager đã khởi tạo');
    }

    /**
     * Play sound khi trả lời sai
     */
    playWrong() {
        this.playSound('wrong');
    }

    /**
     * Play sound khi trả lời đúng
     */
    playCorrect() {
        this.playSound('right');
    }

    playGameplay() {
        this.playSound('gameplay');
    }

    stopGameplay() {
        const gameplayAudio = this.sounds.gameplay;
        if (!gameplayAudio) return;

        gameplayAudio.pause();
        gameplayAudio.currentTime = 0;
    }

    playResult(resultIndex) {
        const soundKey = RESULT_AUDIO_BY_INDEX[resultIndex];
        if (!soundKey) {
            console.warn(`Không có audio result cho index: ${resultIndex}`);
            return;
        }

        this.playSound(soundKey);
    }

    /**
     * Play sound (internal method)
     * @param {string} key - Tên sound cần play
     */
    playSound(key) {
        if (this.sounds[key]) {
            // Reset audio về đầu để có thể play liên tiếp
            this.sounds[key].currentTime = 0;
            // Play
            this.sounds[key].play().catch(error => {
                console.warn(`Không thể play ${key}:`, error);
            });
        } else {
            console.warn(`Sound không tồn tại: ${key}`);
        }
    }
}

// Khởi tạo audioManager khi cần (được gọi trong main.js)
let audioManager = null;

if (typeof module !== 'undefined') {
    module.exports = { AudioManager, RESULT_AUDIO_BY_INDEX };
}
